import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';
import { itemUpdateSchema } from '@/lib/validations';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    const validation = itemUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await prisma.items.findFirst({
      where: { id, garage_id: ctx.garage.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const item = await prisma.items.update({
      where: { id },
      data: {
        ...validation.data,
        category_id: validation.data.category_id || null,
        supplier_id: validation.data.supplier_id || null,
        purchase_price: validation.data.purchase_price !== undefined ? Number(validation.data.purchase_price) : undefined,
        selling_price: validation.data.selling_price !== undefined ? Number(validation.data.selling_price) : undefined,
        vat_rate: validation.data.vat_rate !== undefined ? Number(validation.data.vat_rate) : undefined,
        stock_qty: validation.data.stock_qty !== undefined ? Number(validation.data.stock_qty) : undefined,
        stock_min: validation.data.stock_min !== undefined ? Number(validation.data.stock_min) : undefined,
      },
    });

    return NextResponse.json(item);
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const existing = await prisma.items.findFirst({
      where: { id, garage_id: ctx.garage.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Check if the item is used in documents
    const lineCount = await prisma.document_lines.count({ where: { item_id: id, garage_id: ctx.garage.id } });
    if (lineCount > 0) {
      // Soft delete/deactivate to keep referential integrity for invoices
      const item = await prisma.items.update({
        where: { id },
        data: { active: false },
      });
      return NextResponse.json({ message: 'Item deactivated to preserve billing history', item });
    }

    await prisma.items.delete({ where: { id } });
    return NextResponse.json({ message: 'Item deleted successfully' });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
