// ─── Roboflow License Plate Detection ─────────────────────────────────────────
// Uses Roboflow API: license-plate-recognition-rxg4e/4
// Model: YOLOv8 trained on 10,126 images, 99% mAP

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
const ROBOFLOW_API_URL = 'https://serverless.roboflow.com/license-plate-recognition-rxg4e/4';
const CONFIDENCE_THRESHOLD = 0.45;
const OVERLAP_THRESHOLD = 0.3;

// ─── Get API key from environment ─────────────────────────────────────────────
function getApiKey(): string {
  const key = process.env.NEXT_PUBLIC_ROBOFLOW_API_KEY;
  if (!key) {
    throw new Error('NEXT_PUBLIC_ROBOFLOW_API_KEY not configured. Add it to .env.local');
  }
  return key;
}

// ─── Convert image to base64 ──────────────────────────────────────────────────
function imageToBase64(source: HTMLImageElement | HTMLCanvasElement): string {
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
  return canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
}

// ─── Main detection function ──────────────────────────────────────────────────
export async function detectPlates(
  imageSource: HTMLImageElement | HTMLCanvasElement
): Promise<DetectionResult> {
  const startTime = performance.now();

  // Get image dimensions
  const imageWidth = imageSource instanceof HTMLImageElement
    ? (imageSource.naturalWidth || imageSource.width)
    : imageSource.width;
  const imageHeight = imageSource instanceof HTMLImageElement
    ? (imageSource.naturalHeight || imageSource.height)
    : imageSource.height;

  // Convert to base64
  const base64Image = imageToBase64(imageSource);

  // Call Roboflow API
  const apiKey = getApiKey();
  const response = await fetch(`${ROBOFLOW_API_URL}?api_key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      image: base64Image,
      confidence: String(CONFIDENCE_THRESHOLD),
      overlap: String(OVERLAP_THRESHOLD),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Roboflow API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // Transform predictions to our format
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
    // Draw bounding box
    ctx.strokeRect(det.bbox.x, det.bbox.y, det.bbox.width, det.bbox.height);

    // Draw label
    const label = `Plaque ${(det.confidence * 100).toFixed(1)}%`;
    ctx.fillText(label, det.bbox.x, det.bbox.y - 5);
  }
}
