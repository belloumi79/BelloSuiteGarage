import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';
import { agendaUpdateSchema } from '@/lib/validations';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    const validation = agendaUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await prisma.agenda_events.findFirst({
      where: { id, garage_id: ctx.garage.id },
    });
    if (!existing) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const event = await prisma.agenda_events.update({
      where: { id },
      data: {
        title: validation.data.title,
        description: validation.data.description,
        starts_at: validation.data.starts_at ? new Date(validation.data.starts_at) : undefined,
        ends_at: validation.data.ends_at ? new Date(validation.data.ends_at) : undefined,
        client_id: validation.data.client_id || null,
        vehicle_id: validation.data.vehicle_id || null,
        status: validation.data.status,
        color: validation.data.color,
      },
    });

    return NextResponse.json(event);
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

    const existing = await prisma.agenda_events.findFirst({
      where: { id, garage_id: ctx.garage.id },
    });
    if (!existing) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    await prisma.agenda_events.delete({ where: { id } });

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
