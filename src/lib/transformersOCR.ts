// ─── Transformers.js OCR ──────────────────────────────────────────────────────
// Browser-based OCR using TrOCR model via WebAssembly
// 100% free, no server needed, runs entirely in the browser
// Model: Xenova/trocr-base-printed (printed text recognition)

import { env } from '@huggingface/transformers';

// Use WASM backend (no GPU needed)
env.allowLocalModels = false;

type ImageToTextPipeline = (input: string, options?: { max_new_tokens?: number }) => Promise<Array<{ generated_text: string }>>;

let ocrPipeline: ImageToTextPipeline | null = null;

async function getOCR(): Promise<ImageToTextPipeline> {
  if (!ocrPipeline) {
    // Dynamic import to avoid SSR issues
    const { pipeline } = await import('@huggingface/transformers');
    ocrPipeline = await pipeline('image-to-text', 'Xenova/trocr-base-printed', {
      device: 'wasm',
    }) as ImageToTextPipeline;
  }
  return ocrPipeline;
}

// Convert canvas/dataURL to a Blob URL for Transformers.js
function toBlobUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (src.startsWith('blob:') || src.startsWith('http')) {
      resolve(src);
      return;
    }
    // data URL → canvas → blob
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) resolve(URL.createObjectURL(blob));
        else reject(new Error('Failed to create blob'));
      }, 'image/png');
    };
    img.onerror = reject;
    img.src = src;
  });
}

export async function runTransformersOCR(imageSrc: string): Promise<string> {
  let blobUrl = '';
  try {
    blobUrl = await toBlobUrl(imageSrc);
    const ocr = await getOCR();
    const result = await ocr(blobUrl, {
      max_new_tokens: 100,
    });
    const text = result?.[0]?.generated_text || '';
    return text;
  } catch (error) {
    console.warn('Transformers.js OCR failed:', error);
    return '';
  } finally {
    if (blobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrl);
    }
  }
}
