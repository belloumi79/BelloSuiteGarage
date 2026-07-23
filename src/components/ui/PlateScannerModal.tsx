'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, ScanLine, X, Check, RefreshCw, Sparkles } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { useToast } from '@/components/ui/Toast';

interface PlateScannerModalProps {
  open: boolean;
  onClose: () => void;
  onPlateDetected: (plate: string) => void;
}

export default function PlateScannerModal({
  open,
  onClose,
  onPlateDetected,
}: PlateScannerModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('');
  const [detectedPlate, setDetectedPlate] = useState<string>('');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (!open) return null;

  const startCamera = async () => {
    try {
      setImageSrc(null);
      setDetectedPlate('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.error('Camera access error:', err);
      addToast('Impossible d\'accéder à la caméra. Vérifiez vos permissions.', 'error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
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
      const dataUrl = canvas.toDataURL('image/jpeg');
      setImageSrc(dataUrl);
      stopCamera();
      processOCR(dataUrl);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setImageSrc(dataUrl);
        stopCamera();
        processOCR(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  // Preprocess image for OCR using canvas (contrast boost + grayscale)
  const preprocessImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Convert to high-contrast grayscale
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
          // Increase contrast thresholding
          const factor = 1.3;
          let val = (avg - 128) * factor + 128;
          val = Math.max(0, Math.min(255, val));
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const cleanLicensePlateText = (text: string): string => {
    // Remove extra non-alphanumeric characters except spaces and hyphens
    const lines = text.split('\n');
    let bestCandidate = '';

    for (const line of lines) {
      const cleaned = line.replace(/[^A-Z0-9\s-]/gi, '').trim().toUpperCase();
      if (cleaned.length >= 4) {
        // Tunisian format match: 123 TUN 4567 or 123TUN4567
        const tnMatch = cleaned.match(/(\d{1,4})\s*(TUN|TUNIS|TU|تونس)?\s*(\d{1,4})/i);
        if (tnMatch && tnMatch[1] && tnMatch[3]) {
          return `${tnMatch[1]} TUN ${tnMatch[3]}`;
        }
        // French/Euro format match: AA-123-AA
        const frMatch = cleaned.match(/([A-Z]{1,2})[- ]?(\d{2,3})[- ]?([A-Z]{1,2})/i);
        if (frMatch) {
          return `${frMatch[1]}-${frMatch[2]}-${frMatch[3]}`;
        }
        if (cleaned.length > bestCandidate.length) {
          bestCandidate = cleaned;
        }
      }
    }
    return bestCandidate || text.trim().toUpperCase().replace(/[^A-Z0-9 -]/g, '');
  };

  const processOCR = async (src: string) => {
    setScanning(true);
    setProgress(0);
    setStatusText('Optimisation de la photo...');
    try {
      const processedSrc = await preprocessImage(src);
      setStatusText('Initialisation de l\'IA Tesseract OCR...');

      const worker = await createWorker('eng');
      setStatusText('Détection de la plaque en cours...');

      const ret = await worker.recognize(processedSrc);
      const rawText = ret.data.text;
      const plate = cleanLicensePlateText(rawText);

      await worker.terminate();

      setDetectedPlate(plate);
      setStatusText('Détection terminée !');
      if (plate) {
        addToast(`Plaque détectée : ${plate}`);
      } else {
        addToast('Aucune immatriculation lisible détectée.', 'info');
      }
    } catch (err) {
      console.error('OCR Error:', err);
      setStatusText('Erreur lors de l\'analyse');
      addToast('Erreur lors de l\'analyse de la photo.', 'error');
    } finally {
      setScanning(false);
    }
  };

  const handleConfirm = () => {
    if (detectedPlate) {
      onPlateDetected(detectedPlate);
      stopCamera();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Détection d&apos;Immatriculation IA</h3>
              <p className="text-[11px] text-slate-400">Scanner par Caméra ou Photo de véhicule</p>
            </div>
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="text-slate-400 hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 flex-1">
          {cameraActive ? (
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-blue-500/40">
              <video ref={videoRef} className="w-full h-full object-cover" />
              <div className="absolute inset-x-8 top-1/3 bottom-1/3 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center pointer-events-none">
                <span className="bg-slate-950/80 text-blue-300 text-[11px] px-2 py-0.5 rounded font-mono">
                  Cadrez la plaque ici
                </span>
              </div>
              <button
                onClick={capturePhoto}
                className="absolute bottom-3 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition"
              >
                <Camera className="w-4 h-4" />
                Capturer la plaque
              </button>
            </div>
          ) : imageSrc ? (
            <div className="relative bg-slate-950 rounded-xl overflow-hidden aspect-video border border-slate-800 flex items-center justify-center">
              <img src={imageSrc} alt="Preview" className="w-full h-full object-contain" />
              {scanning && (
                <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center p-4">
                  <Sparkles className="w-8 h-8 text-blue-400 animate-spin mb-2" />
                  <p className="text-xs font-semibold text-slate-200">{statusText}</p>
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
              </button>

              <label className="p-6 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/50 rounded-2xl flex flex-col items-center gap-3 text-slate-300 hover:text-blue-400 transition cursor-pointer">
                <Upload className="w-8 h-8 text-blue-400" />
                <span className="text-xs font-semibold">Importer une Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />

          {/* Detected Plate Result Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <label className="text-xs text-slate-400 font-medium block">
              Résultat Détecté (modifiable) :
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={detectedPlate}
                onChange={(e) => setDetectedPlate(e.target.value.toUpperCase())}
                placeholder="ex. 123 TUN 4567 ou AA-123-AA"
                className="flex-1 bg-slate-900 border border-slate-700 focus:border-blue-500 text-blue-400 font-mono text-base font-extrabold px-3 py-2 rounded-lg tracking-wider"
              />
              {imageSrc && (
                <button
                  type="button"
                  onClick={() => processOCR(imageSrc)}
                  disabled={scanning}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                  title="Réanalyser la photo"
                >
                  <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-900/80">
          <button
            type="button"
            onClick={() => { stopCamera(); setImageSrc(null); setDetectedPlate(''); }}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
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
              disabled={!detectedPlate.trim()}
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
