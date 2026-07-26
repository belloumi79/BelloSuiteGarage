import { NextRequest, NextResponse } from 'next/server';

// ─── Roboflow API Configuration ───────────────────────────────────────────────
// Roboflow serverless API requires multipart/form-data with part named 'file'
const ROBOFLOW_API_URL = 'https://serverless.roboflow.com/license-plate-recognition-rxg4e/4';

// ─── POST /api/roboflow ───────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ROBOFLOW_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ROBOFLOW_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Build new FormData to forward to Roboflow
    const roboflowForm = new FormData();
    roboflowForm.append('file', file, file.name || 'image.jpg');
    if (formData.has('confidence')) {
      roboflowForm.append('confidence', formData.get('confidence') as string);
    }
    if (formData.has('overlap')) {
      roboflowForm.append('overlap', formData.get('overlap') as string);
    }

    const response = await fetch(`${ROBOFLOW_API_URL}?api_key=${apiKey}`, {
      method: 'POST',
      body: roboflowForm,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Roboflow API error:', errorText);
      return NextResponse.json(
        { error: `Roboflow API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Roboflow proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
