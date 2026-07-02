import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const client = await prisma.clients.findFirst({
      where: { id, garage_id: ctx.garage.id },
      include: {
        vehicles: true,
        documents: {
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json(client);
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

    const existing = await prisma.clients.findFirst({
      where: { id, garage_id: ctx.garage.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const client = await prisma.clients.update({
      where: { id },
      data: {
        type: body.type,
        civility: body.civility,
        first_name: body.first_name,
        last_name: body.last_name,
        company_name: body.company_name,
        email: body.email,
        phone: body.phone,
        mobile: body.mobile,
        address_line1: body.address_line1,
        address_line2: body.address_line2,
        postal_code: body.postal_code,
        city: body.city,
        tax_id: body.tax_id,
        notes: body.notes,
        payment_terms_days: body.payment_terms_days !== undefined ? Number(body.payment_terms_days) : undefined,
        discount_percent: body.discount_percent !== undefined ? Number(body.discount_percent) : undefined,
        active: body.active,
      },
    });

    return NextResponse.json(client);
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

    const existing = await prisma.clients.findFirst({
      where: { id, garage_id: ctx.garage.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Check if client has linked documents
    const docCount = await prisma.documents.count({ where: { client_id: id, garage_id: ctx.garage.id } });

    if (docCount > 0) {
      // Deactivate instead of hard delete to preserve invoice history
      const client = await prisma.clients.update({
        where: { id },
        data: { active: false },
      });
      return NextResponse.json({ message: 'Client deactivated', client });
    }

    // Hard delete if no document references exist
    await prisma.clients.delete({ where: { id } });
    return NextResponse.json({ message: 'Client deleted' });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
