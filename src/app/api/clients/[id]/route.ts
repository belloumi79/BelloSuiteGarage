import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await prisma.clients.findUnique({
      where: { id },
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

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

    // Check if client has linked documents
    const docCount = await prisma.documents.count({ where: { client_id: id } });

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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
