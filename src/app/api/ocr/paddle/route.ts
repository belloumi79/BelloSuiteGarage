import { NextRequest, NextResponse } from 'next/server';

// ─── PaddleOCR Proxy ──────────────────────────────────────────────────────────
// Forwards image to local PaddleOCR Python server (localhost:5000)
// Falls back gracefully if server is not running

const PADDLE_OCR_URL = process.env.PADDLE_OCR_URL || 'http://localhost:5000';

// ─── POST /api/ocr/paddle ─────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    // Forward to PaddleOCR server
    const paddleForm = new FormData();
    paddleForm.append('file', file, file.name || 'plate.jpg');

    const response = await fetch(`${PADDLE_OCR_URL}/ocr`, {
      method: 'POST',
      body: paddleForm,
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PaddleOCR error:', errorText);
      return NextResponse.json(
        { error: `PaddleOCR error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    // PaddleOCR server not running — return empty (client falls back to Tesseract)
    console.warn('PaddleOCR not available, falling back to Tesseract:', (error as Error).message);
    return NextResponse.json({ text: '', detections: [], fallback: true });
  }
}
