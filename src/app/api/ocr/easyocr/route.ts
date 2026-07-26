import { NextRequest, NextResponse } from 'next/server';

// ─── EasyOCR Proxy ────────────────────────────────────────────────────────────
// Forwards image to EasyOCR server on Render

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const easyocrUrl = process.env.EASYOCR_URL || process.env.PADDLE_OCR_URL;
    if (!easyocrUrl) {
      return NextResponse.json({ text: '', detections: [], fallback: true });
    }

    const ocrForm = new FormData();
    ocrForm.append('file', file, file.name || 'plate.jpg');

    const response = await fetch(`${easyocrUrl}/ocr`, {
      method: 'POST',
      body: ocrForm,
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      return NextResponse.json({ text: '', detections: [], fallback: true });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.warn('EasyOCR not available:', (error as Error).message);
    return NextResponse.json({ text: '', detections: [], fallback: true });
  }
}
