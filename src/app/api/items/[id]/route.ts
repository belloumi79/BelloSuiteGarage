import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const item = await prisma.items.update({
      where: { id },
      data: {
        category_id: body.category_id || null,
        supplier_id: body.supplier_id || null,
        type: body.type,
        reference: body.reference,
        barcode: body.barcode,
        name: body.name,
        description: body.description,
        unit: body.unit,
        purchase_price: body.purchase_price !== undefined ? Number(body.purchase_price) : undefined,
        selling_price: body.selling_price !== undefined ? Number(body.selling_price) : undefined,
        vat_rate: body.vat_rate !== undefined ? Number(body.vat_rate) : undefined,
        stock_qty: body.stock_qty !== undefined ? Number(body.stock_qty) : undefined,
        stock_min: body.stock_min !== undefined ? Number(body.stock_min) : undefined,
        stock_location: body.stock_location,
        active: body.active,
      },
    });

    return NextResponse.json(item);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if the item is used in documents
    const lineCount = await prisma.document_lines.count({ where: { item_id: id } });
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
