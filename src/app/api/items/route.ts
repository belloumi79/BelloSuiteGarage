/* eslint-disable @typescript-eslint/no-explicit-any */
import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';
import { itemCreateSchema, itemUpdateSchema } from '@/lib/validations';
import { apiHeaders } from '@/lib/api-headers';

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)));

    const where: Record<string, unknown> = {
      garage_id: ctx.garage.id,
      active: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { reference: { contains: search, mode: 'insensitive' as const } },
        { barcode: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    if (type) {
      where.type = type;
    }

    const [items, total] = await Promise.all([
      prisma.items.findMany({
        where,
        include: {
          item_categories: {
            select: { name: true },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.items.count({ where }),
    ]);

    return NextResponse.json({ data: items, total, page, pageSize }, { headers: apiHeaders() });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    // Validate input with Zod
    const validation = itemCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const item = await prisma.items.create({
      data: {
        garage_id: ctx.garage.id,
        ...validation.data,
        purchase_price: Number(validation.data.purchase_price || 0),
        selling_price: Number(validation.data.selling_price || 0),
        vat_rate: Number(validation.data.vat_rate || 19.0),
        stock_qty: Number(validation.data.stock_qty || 0),
        stock_min: Number(validation.data.stock_min || 0),
      },
    });

    return NextResponse.json(item);
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
