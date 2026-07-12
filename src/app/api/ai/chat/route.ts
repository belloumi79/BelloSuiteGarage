import { NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/errors';
import { getCurrentGarage } from '@/lib/context';
import { aiChatWithRetry } from '@/lib/ai';
import { SYSTEM_PROMPTS } from '@/lib/ai/prompts';
import { prisma } from '@/lib/prisma';
import { searchFullText } from '@/lib/rag/search';
import { generateEmbedding } from '@/lib/rag/embeddings';

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, context: contextType, history } = await request.json();
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 });
    }

    const systemPrompt = SYSTEM_PROMPTS[contextType as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS.assistant;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...(history || []),
      { role: 'user' as const, content: message },
    ];

    const ragResults = await ragSearch(message, ctx.garage.id);
    if (ragResults) {
      messages.push({
        role: 'system' as const,
        content: `Tu disposes des données réelles suivantes provenant de la base de données du garage pour répondre.\n${JSON.stringify(ragResults, null, 2)}\n\nRÈGLE STRICTE: Utilise UNIQUEMENT ces données. Si aucune donnée pertinente n'est trouvée, réponds "Je n'ai pas trouvé cette information dans la base de données."`,
      });
    }

    const reply = await aiChatWithRetry(messages);
    return NextResponse.json({ reply });
  } catch (err: unknown) {
    const msg = getErrorMessage(err);
    if (msg.includes('clé API') || msg.includes('GROQ_API_KEY')) {
      return NextResponse.json({ error: msg }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

type RagEntity = {
  entity_type: string;
  entity_id: string;
  content: string;
  metadata: Record<string, unknown>;
};

async function ragSearch(query: string, garageId: string) {
  const results: RagEntity[] = [];
  let hasVectorResults = false;

  try {
    const embedding = await generateEmbedding(query);

    const { searchVector } = await import('@/lib/rag/search');
    const vectorResults = await searchVector(embedding, garageId, 0.25, 8);
    if (vectorResults.length > 0) {
      results.push(...vectorResults);
      hasVectorResults = true;
    }
  } catch {
    // Vector search failed (e.g., model not loaded) — fall back to FTS
  }

  if (!hasVectorResults) {
    try {
      const ftsResults = await searchFullText(query, garageId, 10);
      results.push(...ftsResults);
    } catch {
      // Full-text search also failed
    }
  }

  if (results.length === 0) {
    const directResults = await directSearch(query, garageId);
    if (directResults.length > 0) results.push(...directResults);
  }

  return results.length > 0 ? results : null;
}

async function directSearch(query: string, garageId: string): Promise<RagEntity[]> {
  const results: RagEntity[] = [];

  const detectionPatterns: { pattern: RegExp; type: string; orderByDesc?: string }[] = [
    { pattern: /facture|devis|bon de commande|OR|ordre/i, type: 'document' },
    { pattern: /client|nom|email|téléphone/i, type: 'client' },
    { pattern: /véhicule|voiture|immatriculation|plate|immat/i, type: 'vehicle' },
    { pattern: /pièce|stock|article/i, type: 'item' },
  ];

  const matchedType = detectionPatterns.find(p => p.pattern.test(query))?.type;

  if (!matchedType || matchedType === 'document') {
    const docs = (await prisma.$queryRawUnsafe(
      `SELECT d.id, d.type, d.number, d.status, d."total_ttc", d.object,
              d.issue_date, d.created_at,
              c.company_name AS client_company,
              c.first_name || ' ' || c.last_name AS client_name,
              v.plate AS vehicle_plate
       FROM documents d
       LEFT JOIN clients c ON c.id = d.client_id
       LEFT JOIN vehicles v ON v.id = d.vehicle_id
       WHERE d.garage_id = $1::uuid
       ORDER BY d.created_at DESC
       LIMIT 5`,
      garageId
    )) as Array<Record<string, unknown>>;

    for (const d of docs) {
      results.push({
        entity_type: 'document',
        entity_id: d.id as string,
        content: [
          `Document ${(d.type as string)?.toUpperCase()} N°${d.number}`,
          `Statut: ${d.status}`,
          `Client: ${[d.client_name, d.client_company].filter(Boolean).join(' - ')}`,
          d.object && `Objet: ${d.object}`,
          d.total_ttc != null && `Total TTC: ${d.total_ttc}`,
          d.vehicle_plate && `Véhicule: ${d.vehicle_plate}`,
        ].filter(Boolean).join('\n'),
        metadata: { type: d.type, number: d.number, status: d.status, id: d.id },
      });
    }
  }

  if (!matchedType || matchedType === 'client') {
    const clients = (await prisma.$queryRawUnsafe(
      `SELECT id, first_name, last_name, company_name, email, phone, city
       FROM clients WHERE garage_id = $1::uuid
       ORDER BY created_at DESC LIMIT 5`,
      garageId
    )) as Array<Record<string, unknown>>;

    for (const c of clients) {
      results.push({
        entity_type: 'client',
        entity_id: c.id as string,
        content: `Client: ${[c.first_name, c.last_name].filter(Boolean).join(' ')}${c.company_name ? `\nSociété: ${c.company_name}` : ''}\nEmail: ${c.email}\nTél: ${c.phone}\nVille: ${c.city}`,
        metadata: { first_name: c.first_name, last_name: c.last_name, company_name: c.company_name },
      });
    }
  }

  if (!matchedType || matchedType === 'vehicle') {
    const vehicles = (await prisma.$queryRawUnsafe(
      `SELECT id, plate, make, model, vin, fuel, mileage
       FROM vehicles WHERE garage_id = $1::uuid
       ORDER BY created_at DESC LIMIT 5`,
      garageId
    )) as Array<Record<string, unknown>>;

    for (const v of vehicles) {
      results.push({
        entity_type: 'vehicle',
        entity_id: v.id as string,
        content: `Véhicule: ${[v.make, v.model].filter(Boolean).join(' ')}\nImmatriculation: ${v.plate}\nVIN: ${v.vin}\nCarburant: ${v.fuel}\nKm: ${v.mileage}`,
        metadata: { plate: v.plate, make: v.make, model: v.model, vin: v.vin },
      });
    }
  }

  if (!matchedType || matchedType === 'item') {
    const items = (await prisma.$queryRawUnsafe(
      `SELECT id, name, reference, barcode, stock_qty, selling_price
       FROM items WHERE garage_id = $1::uuid
       ORDER BY created_at DESC LIMIT 5`,
      garageId
    )) as Array<Record<string, unknown>>;

    for (const i of items) {
      results.push({
        entity_type: 'item',
        entity_id: i.id as string,
        content: `Article: ${i.name}\nRéf: ${i.reference}\nCode-barres: ${i.barcode}\nStock: ${i.stock_qty}\nPrix vente: ${i.selling_price}`,
        metadata: { name: i.name, reference: i.reference },
      });
    }
  }

  return results;
}
