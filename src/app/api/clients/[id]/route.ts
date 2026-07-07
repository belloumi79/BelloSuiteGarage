import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';
import { clientUpdateSchema } from '@/lib/validations';
import { apiHeaders } from '@/lib/api-headers';

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

    return NextResponse.json(client, { headers: apiHeaders() });
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

    const validation = clientUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await prisma.clients.findFirst({
      where: { id, garage_id: ctx.garage.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const client = await prisma.clients.update({
      where: { id },
      data: {
        ...validation.data,
        payment_terms_days: validation.data.payment_terms_days !== undefined ? Number(validation.data.payment_terms_days) : undefined,
        discount_percent: validation.data.discount_percent !== undefined ? Number(validation.data.discount_percent) : undefined,
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
