import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';
import { apiHeaders } from '@/lib/api-headers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supplier = await prisma.suppliers.findFirst({
      where: { id, garage_id: ctx.garage.id },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json(supplier, { headers: apiHeaders() });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    if (body.name !== undefined && (!body.name || typeof body.name !== 'string' || !body.name.trim())) {
      return NextResponse.json({ error: 'Le nom du fournisseur est requis' }, { status: 400 });
    }

    const existing = await prisma.suppliers.findFirst({
      where: { id, garage_id: ctx.garage.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const supplier = await prisma.suppliers.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.contact_name !== undefined && { contact_name: body.contact_name }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.website !== undefined && { website: body.website }),
        ...(body.address_line1 !== undefined && { address_line1: body.address_line1 }),
        ...(body.address_line2 !== undefined && { address_line2: body.address_line2 }),
        ...(body.postal_code !== undefined && { postal_code: body.postal_code }),
        ...(body.city !== undefined && { city: body.city }),
        ...(body.country !== undefined && { country: body.country }),
        ...(body.tax_id !== undefined && { tax_id: body.tax_id }),
        ...(body.payment_terms_days !== undefined && { payment_terms_days: Number(body.payment_terms_days) }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.active !== undefined && { active: body.active }),
      },
    });

    return NextResponse.json(supplier);
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

    const existing = await prisma.suppliers.findFirst({
      where: { id, garage_id: ctx.garage.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const itemCount = await prisma.items.count({ where: { supplier_id: id, garage_id: ctx.garage.id } });

    if (itemCount > 0) {
      const supplier = await prisma.suppliers.update({
        where: { id },
        data: { active: false },
      });
      return NextResponse.json({ message: 'Supplier deactivated', supplier });
    }

    await prisma.suppliers.delete({ where: { id } });
    return NextResponse.json({ message: 'Supplier deleted' });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
