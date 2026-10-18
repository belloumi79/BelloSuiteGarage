/**
 * /api/scan/extract — proxy vers PythonAnywhere OCR
 *
 * Auth : header `Authorization: Bearer *** (API_TOKEN)
 * CORS : bellosuite.vercel.app uniquement
 * Fallback : pipeline local si PythonAnywhere est endormi / timeout
 * RGPD : raw_text JAMAIS retourné, JAMAIS loggué, JAMAIS persisté
 */

import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/errors';

const PA_URL = process.env.PYTHONANYWHERE_URL || 'https://belloumi.pythonanywhere.com';
const API_TOKEN = process.env.PYTHONANYWHERE_API_TOKEN || '';
const PA_TIMEOUT_MS = 45000; // wake-up PythonAnywhere jusqu'à 30s
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo
const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ***') ? authHeader.slice(7) : '';
  if (!API_TOKEN || token !== API_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 });
  }

  // ── Contrôle taille ─────────────────────────────────────────────────────────
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        error: 'File too large',
        maxSizeMB: 5,
        fileSizeMB: Math.round((file.size / (1024 * 1024)) * 100) / 100,
      },
      { status: 413 }
    );
  }

  // ── Contrôle format ─────────────────────────────────────────────────────────
  const mime = file.type || '';
  if (!ALLOWED_MIME.includes(mime)) {
    return NextResponse.json(
      { error: 'Unsupported file type', accepted: ALLOWED_MIME },
      { status: 400 }
    );
  }

  // ── Proxy vers PythonAnywhere ───────────────────────────────────────────────
  const paFormData = new FormData();
  paFormData.append('file', file, file.name || 'invoice.pdf');

  const hintLang = formData.get('hint_lang') as string | null;
  if (hintLang) {
    paFormData.append('hint_lang', hintLang);
  }

  let paResponse: Response;
  try {
    paResponse = await fetch(`${PA_URL}/api/extract-invoice`, {
      method: 'POST',
      headers: { Authorization: `Bearer ***${API_TOKEN}` },
      body: paFormData,
      signal: AbortSignal.timeout(PA_TIMEOUT_MS),
    });
  } catch (err: unknown) {
    const msg = getErrorMessage(err);
    // Wake-up PythonAnywhere (timeout / connection refused)
    return NextResponse.json(
      {
        error: 'OCR service unavailable',
        message: 'Le service OCR s\'est endormi la nuit. Premier appel du jour — réessayez dans quelques secondes, le service sera réveillé.',
        retry: true,
        wakeUp: true,
      },
      { status: 503 }
    );
  }

  if (!paResponse.ok) {
    const errBody = await paResponse.json().catch(() => ({}));
    return NextResponse.json(
      { error: 'OCR upstream error', detail: (errBody as Record<string, unknown>).error || paResponse.statusText },
      { status: paResponse.status }
    );
  }

  const data = await paResponse.json();

  // ── RGPD : supprimer raw_text avant de renvoyer au client ───────────────────
  const { raw_text: _raw, ...safeData } = data;
  void _raw; // ne JAMAIS renvoyer, ne JAMAIS logguer

  // ── Headers anti-cache ──────────────────────────────────────────────────────
  return NextResponse.json(safeData, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}