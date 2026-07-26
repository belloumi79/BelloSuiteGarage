// ─── Roboflow License Plate Detection ─────────────────────────────────────────
// Uses Roboflow API: license-plate-recognition-rxg4e/4
// Model: YOLOv8 trained on 10,126 images, 99% mAP
// Roboflow serverless API requires multipart/form-data with part named 'file'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PlateDetection {
  bbox: { x: number; y: number; width: number; height: number };
  confidence: number;
  class: string;
}

export interface DetectionResult {
  detections: PlateDetection[];
  inferenceTime: number;
  imageWidth: number;
  imageHeight: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const ROBOFLOW_API_URL = '/api/roboflow';
const CONFIDENCE_THRESHOLD = 0.45;
const OVERLAP_THRESHOLD = 0.3;

// ─── Convert HTML element to Blob ─────────────────────────────────────────────
function imageToBlob(source: HTMLImageElement | HTMLCanvasElement): Promise<Blob> {
  const canvas = document.createElement('canvas');

  if (source instanceof HTMLImageElement) {
    canvas.width = source.naturalWidth || source.width;
    canvas.height = source.naturalHeight || source.height;
  } else {
    canvas.width = source.width;
    canvas.height = source.height;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot create canvas context');

  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob from canvas'));
      },
      'image/jpeg',
      0.92
    );
  });
}

// ─── Main detection function ──────────────────────────────────────────────────
export async function detectPlates(
  imageSource: HTMLImageElement | HTMLCanvasElement
): Promise<DetectionResult> {
  const startTime = performance.now();

  const imageWidth = imageSource instanceof HTMLImageElement
    ? (imageSource.naturalWidth || imageSource.width)
    : imageSource.width;
  const imageHeight = imageSource instanceof HTMLImageElement
    ? (imageSource.naturalHeight || imageSource.height)
    : imageSource.height;

  // Convert to blob for multipart upload
  const imageBlob = await imageToBlob(imageSource);

  // Build FormData — Roboflow expects the part to be named 'file'
  const formData = new FormData();
  formData.append('file', imageBlob, 'image.jpg');
  formData.append('confidence', String(CONFIDENCE_THRESHOLD));
  formData.append('overlap', String(OVERLAP_THRESHOLD));

  const response = await fetch(ROBOFLOW_API_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Roboflow API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  const detections: PlateDetection[] = (data.predictions || [])
    .filter((p: { confidence: number }) => p.confidence >= CONFIDENCE_THRESHOLD)
    .map((pred: {
      x: number;
      y: number;
      width: number;
      height: number;
      confidence: number;
      class: string;
    }) => ({
      bbox: {
        x: Math.max(0, pred.x - pred.width / 2),
        y: Math.max(0, pred.y - pred.height / 2),
        width: pred.width,
        height: pred.height,
      },
      confidence: pred.confidence,
      class: pred.class,
    }));

  const inferenceTime = performance.now() - startTime;

  return {
    detections,
    inferenceTime,
    imageWidth,
    imageHeight,
  };
}

// ─── Crop plate from image ────────────────────────────────────────────────────
export function cropPlate(
  image: HTMLImageElement | HTMLCanvasElement,
  bbox: { x: number; y: number; width: number; height: number }
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = bbox.width;
  canvas.height = bbox.height;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(
      image,
      bbox.x, bbox.y, bbox.width, bbox.height,
      0, 0, bbox.width, bbox.height
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
    ctx.strokeRect(det.bbox.x, det.bbox.y, det.bbox.width, det.bbox.height);

    const label = `Plaque ${(det.confidence * 100).toFixed(1)}%`;
    ctx.fillText(label, det.bbox.x, det.bbox.y - 5);
  }
}
