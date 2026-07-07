import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';
import { getErrorMessage } from '@/lib/errors';
import { stock_movement_type } from '@prisma/client';
import { stockMovementCreateSchema } from '@/lib/validations';
import { apiHeaders } from '@/lib/api-headers';

/**
 * GET /api/stock-movements?item_id=…&type=…&from=…&to=…
 * Returns the stock movement history, optionally filtered by item, type, or date range.
 */
export async function GET(request: Request) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('item_id') || '';
    const type = searchParams.get('type') || '';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: Record<string, unknown> = { garage_id: ctx.garage.id };

    if (itemId) where.item_id = itemId;
    if (type) where.movement_type = type as stock_movement_type;
    if (from || to) {
      const createdAt: Record<string, unknown> = {};
      if (from) createdAt.gte = new Date(from);
      if (to) createdAt.lte = new Date(to);
      where.created_at = createdAt;
    }

    const movements = await prisma.stock_movements.findMany({
      where,
      include: {
        items: { select: { name: true, reference: true } },
        documents: { select: { number: true, type: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 200,
    });

    return NextResponse.json({ data: movements }, { headers: apiHeaders() });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

/**
 * POST /api/stock-movements
 * Creates a manual stock entry or adjustment (purchase_in, adjustment, return_in).
 * Does NOT create from invoices — that is handled by the documents route.
 */
export async function POST(request: Request) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    const validation = stockMovementCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { item_id, movement_type, quantity, unit_cost, reference, notes } = validation.data;

    const qty = Number(quantity);

    // Verify the item belongs to this garage
    const item = await prisma.items.findFirst({
      where: { id: item_id, garage_id: ctx.garage.id },
    });
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const movement = await prisma.$transaction(async (tx) => {
      // Create the stock movement record
      const created = await tx.stock_movements.create({
        data: {
          garage_id: ctx.garage.id,
          item_id,
          movement_type: movement_type as stock_movement_type,
          quantity: qty,
          unit_cost: unit_cost ? Number(unit_cost) : 0,
          reference: reference || null,
          notes: notes || null,
        },
      });

      // Adjust the item's stock_qty
      const adjustment =
        movement_type === 'sale_out' || movement_type === 'internal_use' || movement_type === 'return_out'
          ? -qty
          : qty; // purchase_in, return_in, return_out, adjustment

      await tx.items.update({
        where: { id: item_id },
        data: {
          stock_qty: {
            increment: adjustment,
          },
        },
      });

      return created;
    });

    return NextResponse.json(movement);
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
