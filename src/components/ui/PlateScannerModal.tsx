'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, ScanLine, X, Check, RefreshCw, Sparkles, AlertCircle, Globe } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { useToast } from '@/components/ui/Toast';
import { detectPlates, cropPlate, type PlateDetection } from '@/lib/roboflowDetection';
import { runTransformersOCR } from '@/lib/transformersOCR';

interface PlateScannerModalProps {
  open: boolean;
  onClose: () => void;
  onPlateDetected: (plate: string) => void;
}

// ─── Arabic-Indic digit mapping ───────────────────────────────────────────────
const AR_TO_EN: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

function normalizeArabicNumerals(s: string): string {
  return s.replace(/[٠-٩]/g, d => AR_TO_EN[d] ?? d);
}

// ─── Fuzzy match for "تونس" (common OCR misreads) ────────────────────────────
// Tesseract often misreads Arabic plates: "toni", "tons", "tuns", "tnl", etc.
const TUNISIA_ARABIC = 'تونس';
const TUNISIA_LATIN_FUZZY = /\b(?:TUNIS|TUNI|TONI|TONS|TUNS|TNL|TNI|TNS|TUN[I1L]|TOI1S)\b/i;
const TUNISIA_ARABIC_FUZZY = /تون[سشصس1]s?|توئس|تون[يى]س|ت و ن س/;

function hasTunisiaMarker(text: string): boolean {
  if (text.includes(TUNISIA_ARABIC)) return true;
  if (TUNISIA_LATIN_FUZZY.test(text)) return true;
  if (TUNISIA_ARABIC_FUZZY.test(text)) return true;
  return false;
}

// ─── Tunisian plate patterns (with OCR error tolerance) ──────────────────────
// Tunisian plates: "123 TN 4567" or "123 تونس 4567" or "RS 1234" (code + number)
const TN_EXACT_ARABIC = /(\d{1,4})\s*تونس\s*(\d{1,4})/;
const TN_EXACT_LATIN = /(\d{1,4})\s*(?:TUNIS|TUNI|TONI|TONS|TUNS|TN|T\.N\.?)\s*(\d{1,4})/i;
const TN_CODE_NUMBER = /\b([A-Z]{2,3})\s*(\d{1,4})\b/;
const TN_NUMBER_CODE = /\b(\d{1,4})\s*([A-Z]{2,3})\b/;
const EU_STANDARD = /\b([A-Z]{1,3})[- ](\d{2,4})[- ]([A-Z]{1,3})\b/;

function extractPlate(raw: string): string {
  const normalized = normalizeArabicNumerals(raw);
  const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean);
  const allText = lines.join(' ');

  // Helper: try to extract from a text block
  function tryExtract(text: string): string {
    const cleaned = text.replace(/[^A-Z0-9\u0600-\u06FF\s.-]/gi, ' ').replace(/\s+/g, ' ').trim();

    // Priority 1: Exact Arabic format: 123 تونس 4567
    const mAr = cleaned.match(TN_EXACT_ARABIC);
    if (mAr) return `${mAr[1]} TN ${mAr[2]}`;

    // Priority 2: Exact Latin format: 123 TUN/TN 4567
    const mLat = cleaned.match(TN_EXACT_LATIN);
    if (mLat) return `${mLat[1]} TN ${mLat[2]}`;

    // Priority 3: Tunisian code+number with Tunisia marker nearby: RS 1234 + "تونس"/"TUNIS"
    if (hasTunisiaMarker(text)) {
      const mCode = cleaned.match(TN_CODE_NUMBER);
      if (mCode) return `${mCode[1]} ${mCode[2]}`.toUpperCase();
      const mNumCode = cleaned.match(TN_NUMBER_CODE);
      if (mNumCode) return `${mNumCode[2]} ${mNumCode[1]}`.toUpperCase();
    }

    // Priority 4: EU standard: AA-123-AA (only if has Tunisia marker)
    if (hasTunisiaMarker(text)) {
      const mEu = cleaned.match(EU_STANDARD);
      if (mEu) return `${mEu[1]}-${mEu[2]}-${mEu[3]}`.toUpperCase();
    }

    // Priority 5: Code+number without marker (weak, only if 2-3 letter code + 1-4 digits)
    const mCodeWeak = cleaned.match(TN_CODE_NUMBER);
    if (mCodeWeak && mCodeWeak[1].length >= 2 && /^\d{1,4}$/.test(mCodeWeak[2]))
      return `${mCodeWeak[1]} ${mCodeWeak[2]}`.toUpperCase();

    return '';
  }

  // Try each line first
  for (const line of lines) {
    const result = tryExtract(line);
    if (result) return result;
  }

  // Try full text
  const fullResult = tryExtract(allText);
  if (fullResult) return fullResult;

  // Last resort: extract longest digit sequences and letter sequences
  const digits = allText.match(/\d{2,5}/g) || [];
  const letters = allText.match(/[A-Z]{2,3}/gi) || [];
  const firstLetter = letters[0];
  const firstDigit = digits[0];
  if (firstDigit && firstLetter) {
    return `${firstLetter.toUpperCase()} ${firstDigit}`;
  }
  if (firstDigit) return firstDigit;

  return '';
}

// ─── Image preprocessing pipeline ────────────────────────────────────────────
// Returns multiple preprocessed versions for OCR to try
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function imageToCanvas(img: HTMLImageElement, maxDim = 1600): HTMLCanvasElement {
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

function toGrayscale(data: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const gray = new Uint8Array(w * h);
  for (let i = 0; i < gray.length; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }
  return gray;
}

function applyCLAHE(gray: Uint8Array, w: number, h: number, clipLimit = 3): Uint8Array {
  // Simplified CLAHE: contrast-limited adaptive histogram equalization
  const blockSize = 32;
  const result = new Uint8Array(gray.length);

  for (let by = 0; by < h; by += blockSize) {
    for (let bx = 0; bx < w; bx += blockSize) {
      const endY = Math.min(by + blockSize, h);
      const endX = Math.min(bx + blockSize, w);

      // Build histogram for this block
      const hist = new Uint32Array(256);
      for (let y = by; y < endY; y++) {
        for (let x = bx; x < endX; x++) {
          hist[gray[y * w + x]]++;
        }
      }

      // Clip histogram
      const numPixels = (endY - by) * (endX - bx);
      const limit = Math.max(1, Math.floor(numPixels * clipLimit / 256));
      let excess = 0;
      for (let i = 0; i < 256; i++) {
        if (hist[i] > limit) {
          excess += hist[i] - limit;
          hist[i] = limit;
        }
      }
      const redist = Math.floor(excess / 256);
      for (let i = 0; i < 256; i++) {
        hist[i] += redist;
      }

      // Build CDF
      const cdf = new Float32Array(256);
      cdf[0] = hist[0];
      for (let i = 1; i < 256; i++) cdf[i] = cdf[i - 1] + hist[i];
      const cdfMin = cdf.find(v => v > 0) || 0;
      const range = numPixels - cdfMin || 1;

      // Apply
      for (let y = by; y < endY; y++) {
        for (let x = bx; x < endX; x++) {
          result[y * w + x] = Math.round(((cdf[gray[y * w + x]] - cdfMin) / range) * 255);
        }
      }
    }
  }
  return result;
}

function applyAdaptiveThreshold(gray: Uint8Array, w: number, h: number, R = 12): Uint8Array {
  const result = new Uint8Array(gray.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, count = 0;
      for (let dy = -R; dy <= R; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -R; dx <= R; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          sum += gray[ny * w + nx];
          count++;
        }
      }
      const threshold = (count ? sum / count : 128) - 8;
      result[y * w + x] = gray[y * w + x] > threshold ? 255 : 0;
    }
  }
  return result;
}

function grayscaleToCanvas(gray: Uint8Array, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(w, h);
  for (let i = 0; i < gray.length; i++) {
    imageData.data[i * 4] = gray[i];
    imageData.data[i * 4 + 1] = gray[i];
    imageData.data[i * 4 + 2] = gray[i];
    imageData.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// Generates multiple preprocessed variants for OCR
async function preprocessVariants(src: string): Promise<string[]> {
  const img = await loadImage(src);
  const canvas = imageToCanvas(img, 1600);
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width, h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const gray = toGrayscale(imageData.data, w, h);
  const variants: string[] = [];

  // Variant 1: Original (upscaled, RGB)
  variants.push(canvas.toDataURL('image/png'));

  // Variant 2: Grayscale
  variants.push(grayscaleToCanvas(gray, w, h).toDataURL('image/png'));

  // Variant 3: CLAHE enhanced
  const clahe = applyCLAHE(gray, w, h, 3);
  variants.push(grayscaleToCanvas(clahe, w, h).toDataURL('image/png'));

  // Variant 4: Adaptive threshold (binarization)
  const binary = applyAdaptiveThreshold(gray, w, h, 12);
  variants.push(grayscaleToCanvas(binary, w, h).toDataURL('image/png'));

  // Variant 5: CLAHE + adaptive threshold (best for noisy plates)
  const claheBinary = applyAdaptiveThreshold(clahe, w, h, 8);
  variants.push(grayscaleToCanvas(claheBinary, w, h).toDataURL('image/png'));

  return variants;
}

// ─── OCR engine ──────────────────────────────────────────────────────────────
// Run a single OCR pass
async function ocrPass(
  imageData: string,
  lang: string,
  psm: number,
  whitelist?: string
): Promise<string> {
  const worker = await createWorker(lang, 1);
  const params: Record<string, string> = {
    tessedit_pageseg_mode: String(psm),
  };
  if (whitelist) {
    params.tessedit_char_whitelist = whitelist;
  }
  await worker.setParameters(params);
  const { data } = await worker.recognize(imageData);
  await worker.terminate();
  return data.text;
}

// ─── PaddleOCR (free, best for Arabic) ───────────────────────────────────────
// Calls a local PaddleOCR server — if available
async function runPaddleOCR(src: string): Promise<string> {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    const formData = new FormData();
    formData.append('file', blob, 'plate.jpg');

    const response = await fetch('/api/ocr/paddle', { method: 'POST', body: formData });
    if (!response.ok) return '';
    const data = await response.json();
    const text: string = data.text || '';
    return text ? extractPlate(text) : '';
  } catch {
    return '';
  }
}

// ─── Dual-pass Tesseract ─────────────────────────────────────────────────────
// English for numbers/Latin + Arabic for تونس (no whitelist for Arabic)
async function runDualPassOCR(imageData: string): Promise<string> {
  // Pass 1: English — digits + uppercase letters (plate characters)
  const engText = await ocrPass(
    imageData,
    'eng',
    7, // PSM 7: single text line
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -'
  );

  // Pass 2: Arabic — NO whitelist, let Tesseract use its full Arabic model
  // PSM 6: assume a single uniform block of text (better for plates)
  const araText = await ocrPass(imageData, 'ara', 6);

  // Combine: try to extract plate from English text first
  let plate = extractPlate(engText);
  if (plate) return plate;

  // Try Arabic text
  plate = extractPlate(araText);
  if (plate) return plate;

  // Try combining both
  const combined = `${engText}\n${araText}`;
  plate = extractPlate(combined);
  if (plate) return plate;

  // Try PSM 13 (raw line) on Arabic
  const araRaw = await ocrPass(imageData, 'ara', 13);
  plate = extractPlate(araRaw);
  if (plate) return plate;

  return '';
}

// ─── Full OCR pipeline ───────────────────────────────────────────────────────
async function runFullOCR(src: string): Promise<string> {
  // 1. Try Transformers.js (TrOCR, browser-based, best for printed text)
  const trResult = await runTransformersOCR(src);
  const trPlate = extractPlate(trResult);
  if (trPlate) return trPlate;

  // 2. Try PaddleOCR if server is running
  const paddleResult = await runPaddleOCR(src);
  if (paddleResult) return paddleResult;

  // 3. Fallback: Tesseract.js with multiple preprocessing variants
  const variants = await preprocessVariants(src);
  for (const variant of variants) {
    const result = await runDualPassOCR(variant);
    if (result) return result;
  }
  return '';
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PlateScannerModal({ open, onClose, onPlateDetected }: PlateScannerModalProps) {
  // ── ALL hooks must be called BEFORE any conditional return ──────────────────
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [detectedPlate, setDetectedPlate] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [yoloDetections, setYoloDetections] = useState<PlateDetection[]>([]);
  const [detectionMode, setDetectionMode] = useState<'yolo' | 'ocr'>('yolo');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { addToast } = useToast();

  // Bind stream to <video> once cameraActive=true renders the element
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
    }
  }, [cameraActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, []);

  // OCR function — must be defined before early return
  const processOCR = useCallback(async (src: string) => {
    setScanning(true);
    setYoloDetections([]);
    setStatusText("Connexion à Roboflow…");
    try {
      // Load image into an element
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = src;
      });

      let plate = '';

      if (detectionMode === 'yolo') {
        // Roboflow detection mode
        setStatusText('Détection Roboflow des plaques…');
        const yoloResult = await detectPlates(img);
        setYoloDetections(yoloResult.detections);

        if (yoloResult.detections.length > 0) {
          setStatusText(`${yoloResult.detections.length} plaque(s) détectée(s) en ${Math.round(yoloResult.inferenceTime)}ms`);

          // Process each detected plate — Transformers.js first, then PaddleOCR, then Tesseract
          for (let i = 0; i < yoloResult.detections.length; i++) {
            const det = yoloResult.detections[i];
            setStatusText(`OCR sur plaque ${i + 1}/${yoloResult.detections.length}…`);

            // Crop the plate region
            const croppedCanvas = cropPlate(img, det.bbox);
            const croppedSrc = croppedCanvas.toDataURL('image/png');

            // Try Transformers.js first (browser-based TrOCR)
            setStatusText(`Transformers.js OCR plaque ${i + 1}…`);
            const trText = await runTransformersOCR(croppedSrc);
            plate = extractPlate(trText);

            // Try PaddleOCR if available
            if (!plate) {
              setStatusText(`PaddleOCR plaque ${i + 1}…`);
              plate = await runPaddleOCR(croppedSrc);
            }

            // Fallback: Tesseract dual-pass with preprocessing variants
            if (!plate) {
              setStatusText(`Tesseract OCR plaque ${i + 1}…`);
              const variants = await preprocessVariants(croppedSrc);
              for (const variant of variants) {
                plate = await runDualPassOCR(variant);
                if (plate) break;
              }
            }

            if (plate) break;
          }
        } else {
          // No plates detected by Roboflow, fallback to full image OCR
          setStatusText('Aucune plaque détectée, essai OCR global…');
          plate = await runFullOCR(src);
        }
      } else {
        // Direct OCR mode — multiple preprocessing + dual-pass
        setStatusText('Analyse OCR (Arabe + Anglais)…');
        plate = await runFullOCR(src);
      }

      setDetectedPlate(plate);
      setStatusText('Détection terminée !');
      if (plate) {
        addToast(`Plaque détectée : ${plate}`);
      } else {
        addToast('Aucune immatriculation lisible. Essayez une image plus nette.', 'info');
      }
    } catch (err) {
      console.error('Detection Error:', err);
      setStatusText("Erreur lors de l'analyse");
      addToast("Erreur lors de l'analyse de la photo.", 'error');
    } finally {
      setScanning(false);
    }
  }, [addToast, detectionMode]);

  // ── Early return AFTER all hooks ────────────────────────────────────────────
  if (!open) return null;

  // ── Camera helpers ──────────────────────────────────────────────────────────
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    setImageSrc(null);
    setDetectedPlate('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const hint = msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')
        ? 'Accès caméra refusé. Autorisez la caméra dans les paramètres du navigateur.'
        : `Impossible d'accéder à la caméra : ${msg}`;
      setCameraError(hint);
      addToast(hint, 'error');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setImageSrc(dataUrl);
      stopCamera();
      processOCR(dataUrl);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImageSrc(dataUrl);
      stopCamera();
      processOCR(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    stopCamera();
    setImageSrc(null);
    setDetectedPlate('');
    setStatusText('');
    setCameraError(null);
    setYoloDetections([]);
  };

  const handleConfirm = () => {
    if (detectedPlate) {
      onPlateDetected(detectedPlate);
      stopCamera();
      onClose();
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col">

        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Détection d&apos;Immatriculation IA</h3>
              <p className="text-[11px] text-slate-400">Formats : Tunisien (arabe &amp; latin) · Européen</p>
            </div>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }} className="text-slate-400 hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 flex-1">

          {cameraError && (
            <div className="flex items-start gap-2 bg-red-900/30 border border-red-500/40 rounded-xl p-3 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {cameraError}
            </div>
          )}

          {/* Detection Mode Toggle */}
          {!imageSrc && !cameraActive && (
            <div className="flex gap-2 p-1 bg-slate-800/60 rounded-xl">
              <button
                onClick={() => setDetectionMode('yolo')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition ${
                  detectionMode === 'yolo'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-4 h-4" />
                Roboflow + OCR
              </button>
              <button
                onClick={() => setDetectionMode('ocr')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition ${
                  detectionMode === 'ocr'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ScanLine className="w-4 h-4" />
                OCR Seul
              </button>
            </div>
          )}

          {cameraActive ? (
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video border border-blue-500/40">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <div className="absolute inset-x-8 top-1/3 bottom-1/3 border-2 border-dashed border-blue-400 rounded-lg pointer-events-none flex items-center justify-center">
                <span className="bg-slate-950/80 text-blue-300 text-[11px] px-2 py-0.5 rounded font-mono">
                  Cadrez la plaque ici
                </span>
              </div>
              <button
                onClick={capturePhoto}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition"
              >
                <Camera className="w-4 h-4" />
                Capturer la plaque
              </button>
            </div>

          ) : imageSrc ? (
            <div className="relative bg-slate-950 rounded-xl overflow-hidden aspect-video border border-slate-800 flex items-center justify-center">
              <img src={imageSrc} alt="Preview plaque" className="w-full h-full object-contain" />

              {/* YOLO Detection Boxes Overlay */}
              {yoloDetections.length > 0 && !scanning && (
                <div className="absolute inset-0 pointer-events-none">
                  {yoloDetections.map((det, idx) => {
                    const imgEl = document.querySelector('img[alt="Preview plaque"]') as HTMLImageElement;
                    if (!imgEl) return null;

                    const imgW = imgEl.clientWidth;
                    const imgH = imgEl.clientHeight;
                    const natW = imgEl.naturalWidth || imgW;
                    const natH = imgEl.naturalHeight || imgH;

                    const scale = Math.min(imgW / natW, imgH / natH);
                    const displayW = natW * scale;
                    const displayH = natH * scale;
                    const offsetX = (imgW - displayW) / 2;
                    const offsetY = (imgH - displayH) / 2;

                    const x = offsetX + (det.bbox.x / natW) * displayW;
                    const y = offsetY + (det.bbox.y / natH) * displayH;
                    const w = (det.bbox.width / natW) * displayW;
                    const h = (det.bbox.height / natH) * displayH;

                    return (
                      <div
                        key={idx}
                        className="absolute border-2 border-green-400 rounded"
                        style={{ left: x, top: y, width: w, height: h }}
                      >
                        <span className="absolute -top-5 left-0 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                          Plaque {(det.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {scanning && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4">
                  <Sparkles className="w-8 h-8 text-blue-400 animate-spin" />
                  <p className="text-xs font-semibold text-slate-200 text-center">{statusText}</p>
                </div>
              )}
              {!scanning && (
                <div className="absolute top-2 right-2 flex gap-2">
                  <label className="p-2 bg-blue-600/90 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg transition cursor-pointer">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Changer la photo
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              )}
            </div>

          ) : (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={startCamera}
                className="p-6 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/50 rounded-2xl flex flex-col items-center gap-3 text-slate-300 hover:text-blue-400 transition"
              >
                <Camera className="w-8 h-8 text-blue-400" />
                <span className="text-xs font-semibold">Utiliser la Caméra</span>
                <span className="text-[10px] text-slate-500 text-center">Pointer vers la plaque</span>
              </button>
              <label className="p-6 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/50 rounded-2xl flex flex-col items-center gap-3 text-slate-300 hover:text-blue-400 transition cursor-pointer">
                <Upload className="w-8 h-8 text-blue-400" />
                <span className="text-xs font-semibold">Importer une Photo</span>
                <span className="text-[10px] text-slate-500 text-center">JPG, PNG, WebP</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />

          {/* Result */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <label className="text-xs text-slate-400 font-medium block">
              Immatriculation détectée <span className="text-slate-600">(modifiable)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={detectedPlate}
                onChange={(e) => setDetectedPlate(e.target.value.toUpperCase())}
                placeholder="ex: RS 1234 · 123 TN 4567 · AA-123-AA"
                className="flex-1 bg-slate-900 border border-slate-700 focus:border-blue-500 text-blue-400 font-mono text-sm font-bold px-3 py-2 rounded-lg tracking-wider placeholder:text-slate-600 placeholder:font-normal focus:outline-none"
              />
              {imageSrc && (
                <button
                  type="button"
                  onClick={() => processOCR(imageSrc)}
                  disabled={scanning}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                  title="Réanalyser"
                >
                  <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-600">
              Formats : <span className="text-slate-500">RS 1234 · 123 TN 4567 · أرقام عربية · AA-123-AA</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-between items-center">
          <button type="button" onClick={handleReset} className="text-xs text-slate-400 hover:text-slate-200">
            Réinitialiser
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { stopCamera(); onClose(); }}
              className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!detectedPlate.trim() || scanning}
              className="px-4 py-2 rounded-xl text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Valider la plaque
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
