import { NextRequest, NextResponse } from 'next/server';

// ─── PaddleOCR Proxy ──────────────────────────────────────────────────────────
// Forwards image to PaddleOCR server on Render
// Falls back gracefully if server is not running

// ─── POST /api/ocr/paddle ─────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const paddleUrl = process.env.PADDLE_OCR_URL;
    if (!paddleUrl) {
      return NextResponse.json({ text: '', detections: [], fallback: true });
    }

    // Forward to PaddleOCR server
    const paddleForm = new FormData();
    paddleForm.append('file', file, file.name || 'plate.jpg');

    const response = await fetch(`${paddleUrl}/ocr`, {
      method: 'POST',
      body: paddleForm,
      signal: AbortSignal.timeout(30000), // 30s for cold starts
    });

    if (!response.ok) {
      console.error('PaddleOCR error:', response.status);
      return NextResponse.json({ text: '', detections: [], fallback: true });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.warn('PaddleOCR not available:', (error as Error).message);
    return NextResponse.json({ text: '', detections: [], fallback: true });
  }
}
