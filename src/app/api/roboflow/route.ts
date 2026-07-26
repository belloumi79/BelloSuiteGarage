import { NextRequest, NextResponse } from 'next/server';

// ─── Roboflow API Configuration ───────────────────────────────────────────────
const ROBOFLOW_API_URL = 'https://serverless.roboflow.com/license-plate-recognition-rxg4e/4';

// ─── POST /api/roboflow ───────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, confidence = 0.45, overlap = 0.3 } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
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

    // Forward request to Roboflow API (using form-urlencoded)
    const formData = new URLSearchParams();
    formData.append('image', image);
    formData.append('confidence', String(confidence));
    formData.append('overlap', String(overlap));

    const response = await fetch(`${ROBOFLOW_API_URL}?api_key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
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
