import * as ort from 'onnxruntime-web';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PlateDetection {
  bbox: { x: number; y: number; width: number; height: number };
  confidence: number;
  class: number;
}

export interface YOLOResult {
  detections: PlateDetection[];
  inferenceTime: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MODEL_PATH = '/model/license-plate-detector.onnx';
const INPUT_SIZE = 640;
const CONFIDENCE_THRESHOLD = 0.45;
const IOU_THRESHOLD = 0.5;
const CLASSES = ['license_plate'];

// ─── Singleton session ────────────────────────────────────────────────────────
let sessionPromise: Promise<ort.InferenceSession> | null = null;

async function getSession(): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    sessionPromise = ort.InferenceSession.create(MODEL_PATH, {
      executionProviders: ['wasm', 'cpu'],
      graphOptimizationLevel: 'all',
    });
  }
  return sessionPromise;
}

// ─── Preprocessing ────────────────────────────────────────────────────────────
function preprocessImage(
  imageData: ImageData
): { tensor: ort.Tensor; padInfo: { padX: number; padY: number; ratio: number } } {
  const { width, height, data } = imageData;

  // Calculate letterbox padding
  const ratio = Math.min(INPUT_SIZE / width, INPUT_SIZE / height);
  const newWidth = Math.round(width * ratio);
  const newHeight = Math.round(height * ratio);
  const padX = (INPUT_SIZE - newWidth) / 2;
  const padY = (INPUT_SIZE - newHeight) / 2;

  // Create input tensor (NCHW format, normalized 0-1)
  const input = new Float32Array(1 * 3 * INPUT_SIZE * INPUT_SIZE);

  // Fill with gray (0.5) for padding
  input.fill(0.5);

  // Resize and normalize image
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = Math.round(x / ratio);
      const srcY = Math.round(y / ratio);
      const srcIdx = (srcY * width + srcX) * 4;

      const dstX = Math.round(padX + x);
      const dstY = Math.round(padY + y);

      // RGB channels, normalized to [0, 1]
      input[0 * INPUT_SIZE * INPUT_SIZE + dstY * INPUT_SIZE + dstX] = data[srcIdx] / 255.0;
      input[1 * INPUT_SIZE * INPUT_SIZE + dstY * INPUT_SIZE + dstX] = data[srcIdx + 1] / 255.0;
      input[2 * INPUT_SIZE * INPUT_SIZE + dstY * INPUT_SIZE + dstX] = data[srcIdx + 2] / 255.0;
    }
  }

  const tensor = new ort.Tensor('float32', input, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  return { tensor, padInfo: { padX, padY, ratio } };
}

// ─── Postprocessing: NMS ─────────────────────────────────────────────────────
function nonMaxSuppression(
  boxes: PlateDetection[],
  iouThreshold: number
): PlateDetection[] {
  if (boxes.length === 0) return [];

  // Sort by confidence descending
  const sorted = [...boxes].sort((a, b) => b.confidence - a.confidence);
  const result: PlateDetection[] = [];

  while (sorted.length > 0) {
    const best = sorted.shift()!;
    result.push(best);

    // Remove overlapping boxes
    for (let i = sorted.length - 1; i >= 0; i--) {
      const iou = calculateIoU(best.bbox, sorted[i].bbox);
      if (iou > iouThreshold) {
        sorted.splice(i, 1);
      }
    }
  }

  return result;
}

function calculateIoU(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);

  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  const union = areaA + areaB - intersection;

  return union > 0 ? intersection / union : 0;
}

// ─── Postprocessing: Decode output ────────────────────────────────────────────
function postprocess(
  output: ort.Tensor,
  padInfo: { padX: number; padY: number; ratio: number }
): PlateDetection[] {
  const data = output.data as Float32Array;
  const [batch, numClasses, numAnchors] = output.dims;

  // YOLOv8 output shape: [1, 5+numClasses, 8400]
  // data format: [x_center, y_center, w, h, obj_conf, class_scores...]
  const detections: PlateDetection[] = [];
  const numFeatures = numClasses; // Should be 5 + numClasses

  for (let i = 0; i < numAnchors; i++) {
    // Extract values for this anchor
    const x = data[0 * numAnchors + i];
    const y = data[1 * numAnchors + i];
    const w = data[2 * numAnchors + i];
    const h = data[3 * numAnchors + i];
    const objConf = data[4 * numAnchors + i];

    // Get class scores (skip first 5 values: x, y, w, h, obj_conf)
    const classScores: number[] = [];
    for (let c = 0; c < numClasses - 5; c++) {
      classScores.push(data[(5 + c) * numAnchors + i]);
    }

    // Find best class
    const maxClassScore = Math.max(...classScores, 0);
    const confidence = objConf * maxClassScore;

    if (confidence < CONFIDENCE_THRESHOLD) continue;

    // Convert from center to corner format and remove padding
    const boxX = (x - padInfo.padX) / padInfo.ratio;
    const boxY = (y - padInfo.padY) / padInfo.ratio;
    const boxW = w / padInfo.ratio;
    const boxH = h / padInfo.ratio;

    detections.push({
      bbox: {
        x: Math.max(0, boxX - boxW / 2),
        y: Math.max(0, boxY - boxH / 2),
        width: boxW,
        height: boxH,
      },
      confidence,
      class: classScores.indexOf(maxClassScore),
    });
  }

  return nonMaxSuppression(detections, IOU_THRESHOLD);
}

// ─── Main detection function ──────────────────────────────────────────────────
export async function detectPlates(
  imageSource: HTMLImageElement | HTMLCanvasElement | ImageData
): Promise<YOLOResult> {
  const startTime = performance.now();

  // Get ImageData
  let imageData: ImageData;
  if (imageSource instanceof HTMLImageElement) {
    const canvas = document.createElement('canvas');
    canvas.width = imageSource.naturalWidth || imageSource.width;
    canvas.height = imageSource.naturalHeight || imageSource.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot create canvas context');
    ctx.drawImage(imageSource, 0, 0);
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } else if (imageSource instanceof HTMLCanvasElement) {
    const ctx = imageSource.getContext('2d');
    if (!ctx) throw new Error('Cannot get canvas context');
    imageData = ctx.getImageData(0, 0, imageSource.width, imageSource.height);
  } else {
    imageData = imageSource;
  }

  // Preprocess
  const { tensor, padInfo } = preprocessImage(imageData);

  // Run inference
  const session = await getSession();
  const results = await session.run({ images: tensor });

  // Get output tensor (first output)
  const outputTensor = Object.values(results)[0];

  // Postprocess
  const detections = postprocess(outputTensor, padInfo);

  const inferenceTime = performance.now() - startTime;

  return { detections, inferenceTime };
}

// ─── Crop plate from image ────────────────────────────────────────────────────
export function cropPlate(
  image: HTMLImageElement | HTMLCanvasElement,
  bbox: { x: number; y: number; width: number; height: number }
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');

  // Get source dimensions
  const srcWidth = image instanceof HTMLImageElement
    ? (image.naturalWidth || image.width)
    : image.width;
  const srcHeight = image instanceof HTMLImageElement
    ? (image.naturalHeight || image.height)
    : image.height;

  // Calculate scale if image was resized
  const scale = Math.min(1280 / srcWidth, 720 / srcHeight, 1);

  const cropX = bbox.x;
  const cropY = bbox.y;
  const cropW = bbox.width;
  const cropH = bbox.height;

  canvas.width = cropW;
  canvas.height = cropH;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(
      image,
      cropX, cropY, cropW, cropH,
      0, 0, cropW, cropH
    );
  }

  return canvas;
}

// ─── Draw detections on canvas ────────────────────────────────────────────────
export function drawDetections(
  canvas: HTMLCanvasElement,
  detections: PlateDetection[]
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 3;
  ctx.font = '16px Arial';
  ctx.fillStyle = '#00ff00';

  for (const det of detections) {
    // Draw bounding box
    ctx.strokeRect(det.bbox.x, det.bbox.y, det.bbox.width, det.bbox.height);

    // Draw label
    const label = `Plate ${(det.confidence * 100).toFixed(1)}%`;
    ctx.fillText(label, det.bbox.x, det.bbox.y - 5);
  }
}
