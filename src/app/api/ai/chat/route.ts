import { NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/errors';
import { getCurrentGarage } from '@/lib/context';
import { aiChat } from '@/lib/ai';
import { SYSTEM_PROMPTS } from '@/lib/ai/prompts';
import { prisma } from '@/lib/prisma';

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

    if (message.toLowerCase().includes('recherche') || message.toLowerCase().includes('cherche') || message.toLowerCase().includes('trouve')) {
      const searchResult = await handleSearchQuery(message, ctx.garage.id);
      if (searchResult) {
        messages.push({
          role: 'system' as const,
          content: `Voici les données trouvées en base pour répondre à la question:\n${JSON.stringify(searchResult, null, 2)}\n\nRéponds à l'utilisateur en français avec ces informations.`,
        });
      }
    }

    const reply = await aiChat(messages);
    return NextResponse.json({ reply });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

async function handleSearchQuery(query: string, garageId: string) {
  const results: Record<string, unknown[]> = {};

  if (/client|nom|email|téléphone/i.test(query)) {
    const clients = await prisma.clients.findMany({
      where: {
        garage_id: garageId,
        OR: [
          { first_name: { contains: query, mode: 'insensitive' } },
          { last_name: { contains: query, mode: 'insensitive' } },
          { company_name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 5,
      select: { id: true, first_name: true, last_name: true, company_name: true, email: true, phone: true },
    });
    if (clients.length > 0) results.clients = clients;
  }

  if (/véhicule|voiture|immatriculation|plate|marque|modèle/i.test(query)) {
    const vehicles = await prisma.vehicles.findMany({
      where: {
        garage_id: garageId,
        OR: [
          { plate: { contains: query, mode: 'insensitive' } },
          { make: { contains: query, mode: 'insensitive' } },
          { model: { contains: query, mode: 'insensitive' } },
          { vin: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 5,
      select: { id: true, plate: true, make: true, model: true, vin: true, fuel: true, mileage: true },
    });
    if (vehicles.length > 0) results.vehicles = vehicles;
  }

  if (/document|facture|devis|OR|ordre|intervention|réparation/i.test(query)) {
    const documents = await prisma.documents.findMany({
      where: {
        garage_id: garageId,
        OR: [
          { number: { contains: query, mode: 'insensitive' } },
          { object: { contains: query, mode: 'insensitive' } },
          { notes: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 5,
      include: {
        clients: { select: { company_name: true, first_name: true, last_name: true } },
        vehicles: { select: { plate: true, make: true, model: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    if (documents.length > 0) results.documents = documents;
  }

  if (/pièce|stock|article|matériel/i.test(query)) {
    const items = await prisma.items.findMany({
      where: {
        garage_id: garageId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { reference: { contains: query, mode: 'insensitive' } },
          { barcode: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 5,
      select: { id: true, name: true, reference: true, barcode: true, stock_qty: true, selling_price: true },
    });
    if (items.length > 0) results.items = items;
  }

  return Object.keys(results).length > 0 ? results : null;
}
