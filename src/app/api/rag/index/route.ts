import { NextResponse } from 'next/server';
import { getCurrentGarage } from '@/lib/context';
import { indexAll } from '@/lib/rag/indexer';

export async function POST() {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await indexAll(ctx.garage.id);
    return NextResponse.json({ success: true, indexed: result.indexed });
  } catch (e) {
    console.error('Indexing failed:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Indexing failed' },
      { status: 500 }
    );
  }
}
