'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, ScanLine, X, Check, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { useToast } from '@/components/ui/Toast';

interface PlateScannerModalProps {
  open: boolean;
  onClose: () => void;
  onPlateDetected: (plate: string) => void;
}

// ─── Tunisian plate patterns ──────────────────────────────────────────────────
// Latin modern:  "RS 1234"  (RS = région série, 1-4 digits)
// Latin old:     "123 TN 4567" or "123 TUN 4567"
// Arabic:        Arabic-Indic digits + تونس or ت
const TN_LATIN_NEW = /\b([A-Z]{1,3})\s*(\d{1,4})\b/i;
const TN_LATIN_OLD = /(\d{1,4})\s*(TUN|TUNIS|TN|ت)\s*(\d{1,4})/i;
const EU_STANDARD  = /\b([A-Z]{1,3})[- ](\d{2,4})[- ]([A-Z]{1,3})\b/i;

// Arabic-Indic digit map
const AR_TO_EN: Record<string, string> = {
  '٠':'0','١':'1','٢':'2','٣':'3','٤':'4',
  '٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
};
function normalizeArabicNumerals(s: string): string {
  return s.replace(/[٠-٩]/g, d => AR_TO_EN[d] ?? d);
}

function extractPlate(raw: string): string {
  const normalized = normalizeArabicNumerals(raw);
  const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const cleaned = line.replace(/[^A-Z0-9\s\-]/gi, ' ').replace(/\s+/g, ' ').trim();

    const m1 = cleaned.match(TN_LATIN_OLD);
    if (m1) return `${m1[1]} TN ${m1[3]}`.toUpperCase();

    const m2 = cleaned.match(TN_LATIN_NEW);
    if (m2 && m2[1].length <= 3 && parseInt(m2[2]) > 0)
      return `${m2[1].toUpperCase()} ${m2[2]}`;

    const m3 = cleaned.match(EU_STANDARD);
    if (m3) return `${m3[1]}-${m3[2]}-${m3[3]}`.toUpperCase();
  }

  // Fallback: return longest alphanumeric token
  const tokens = normalized.replace(/[^A-Z0-9\s]/gi, ' ').split(/\s+/).filter(t => t.length >= 2);
  if (tokens.length) return tokens.join(' ').toUpperCase();
  return '';
}

// ─── Image preprocessing (adaptive binarization) ─────────────────────────────
function preprocessImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);

      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      const gray = new Uint8Array(w * h);

      // Grayscale
      for (let i = 0; i < gray.length; i++) {
        const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
        gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      }

      // Adaptive threshold (local mean with block radius 15)
      const R = 15;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = y * w + x;
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
          const threshold = sum / count - 5; // slight bias toward white bg
          const val = gray[idx] > threshold ? 255 : 0;
          data[idx * 4] = val;
          data[idx * 4 + 1] = val;
          data[idx * 4 + 2] = val;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PlateScannerModal({ open, onClose, onPlateDetected }: PlateScannerModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [detectedPlate, setDetectedPlate] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { addToast } = useToast();

  // ── Assign stream to video element once it is rendered ──────────────────────
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
    }
  }, [cameraActive]);

  // ── Cleanup on unmount / close ───────────────────────────────────────────────
  useEffect(() => {
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;

  // ── Camera helpers ───────────────────────────────────────────────────────────
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
      setCameraActive(true); // <-- triggers useEffect above to bind srcObject
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const hint = msg.includes('Permission')
        ? 'Accès caméra refusé. Autorisez la caméra dans les paramètres du navigateur.'
        : `Impossible d'accéder à la caméra: ${msg}`;
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

  // ── OCR ──────────────────────────────────────────────────────────────────────
  const processOCR = useCallback(async (src: string) => {
    setScanning(true);
    setStatusText("Prétraitement de l'image…");
    try {
      const processed = await preprocessImage(src);
      setStatusText('Initialisation OCR (Eng + Arabe)…');

      // Try with English first (faster), then with Arabic if no result
      const workerEng = await createWorker('eng', 1, {
        logger: (m: { progress: number }) => {
          if (m.progress) setStatusText(`Analyse… ${Math.round(m.progress * 100)}%`);
        },
      });
      await workerEng.setParameters({ tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -' });
      const { data: dataEng } = await workerEng.recognize(processed);
      await workerEng.terminate();

      let plate = extractPlate(dataEng.text);

      // If nothing found, try Arabic pass
      if (!plate) {
        setStatusText('Essai avec OCR arabe…');
        const workerAra = await createWorker('ara');
        const { data: dataAra } = await workerAra.recognize(processed);
        await workerAra.terminate();
        plate = extractPlate(dataAra.text);
      }

      setDetectedPlate(plate);
      setStatusText('Détection terminée !');
      if (plate) {
        addToast(`Plaque détectée : ${plate}`);
      } else {
        addToast('Aucune immatriculation lisible. Essayez une image plus nette.', 'info');
      }
    } catch (err) {
      console.error('OCR Error:', err);
      setStatusText("Erreur lors de l'analyse");
      addToast("Erreur lors de l'analyse de la photo.", 'error');
    } finally {
      setScanning(false);
    }
  }, [addToast]);

  // ── Confirm ──────────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    if (detectedPlate) {
      onPlateDetected(detectedPlate);
      stopCamera();
      onClose();
    }
  };

  const handleReset = () => {
    stopCamera();
    setImageSrc(null);
    setDetectedPlate('');
    setStatusText('');
    setCameraError(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
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

          {/* Camera error */}
          {cameraError && (
            <div className="flex items-start gap-2 bg-red-900/30 border border-red-500/40 rounded-xl p-3 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {cameraError}
            </div>
          )}

          {/* Camera view */}
          {cameraActive ? (
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video border border-blue-500/40">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              {/* Plate guide frame */}
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
            /* Preview + OCR overlay */
            <div className="relative bg-slate-950 rounded-xl overflow-hidden aspect-video border border-slate-800 flex items-center justify-center">
              <img src={imageSrc} alt="Preview plaque" className="w-full h-full object-contain" />
              {scanning && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4">
                  <Sparkles className="w-8 h-8 text-blue-400 animate-spin" />
                  <p className="text-xs font-semibold text-slate-200 text-center">{statusText}</p>
                </div>
              )}
            </div>

          ) : (
            /* Action buttons */
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

          {/* Hidden canvas for frame capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Result box */}
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
              Formats supportés : <span className="text-slate-500">RS 1234 · 123 TN 4567 · أرقام عربية · AA-123-AA</span>
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
