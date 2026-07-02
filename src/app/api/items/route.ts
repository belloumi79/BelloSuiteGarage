/* eslint-disable @typescript-eslint/no-explicit-any */
import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || ''; // part | labor | service

    const whereClause: any = {
      garage_id: ctx.garage.id,
      active: true,
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      whereClause.type = type;
    }

    const items = await prisma.items.findMany({
      where: whereClause,
      include: {
        item_categories: {
          select: { name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(items);
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const item = await prisma.items.create({
      data: {
        garage_id: ctx.garage.id,
        category_id: body.category_id || null,
        supplier_id: body.supplier_id || null,
        type: body.type || 'part',
        reference: body.reference || null,
        barcode: body.barcode || null,
        name: body.name,
        description: body.description,
        unit: body.unit || 'pcs',
        purchase_price: body.purchase_price ? Number(body.purchase_price) : 0,
        selling_price: body.selling_price ? Number(body.selling_price) : 0,
        vat_rate: body.vat_rate ? Number(body.vat_rate) : 19.0,
        stock_qty: body.stock_qty ? Number(body.stock_qty) : 0,
        stock_min: body.stock_min ? Number(body.stock_min) : 0,
        stock_location: body.stock_location || null,
        active: true,
      },
    });

    return NextResponse.json(item);
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
