import type { FeatureExtractionPipeline } from '@xenova/transformers';

let pipeline: FeatureExtractionPipeline | null = null;

async function getPipeline(): Promise<FeatureExtractionPipeline> {
  if (pipeline) return pipeline;
  const { pipeline: p } = await import('@xenova/transformers');
  pipeline = await p('feature-extraction', 'Xenova/all-MiniLM-L6-v2') as FeatureExtractionPipeline;
  return pipeline;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const extractor = await getPipeline();
    const result = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(result.data as Iterable<number>);
  } catch (e) {
    console.error('Embedding generation failed:', e);
    throw e;
  }
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const extractor = await getPipeline();
  const results: number[][] = [];

  for (const text of texts) {
    const result = await extractor(text, { pooling: 'mean', normalize: true });
    results.push(Array.from(result.data as Iterable<number>));
  }

  return results;
}

export function truncateText(text: string, maxLen = 8000): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen);
}
