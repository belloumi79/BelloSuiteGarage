import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';
import { apiHeaders } from '@/lib/api-headers';
import { z } from 'zod';

const reminderUpdateSchema = z.object({
  reminder_time: z.string().datetime().optional(),
  channel: z.enum(['in_app', 'sms', 'whatsapp', 'email']).optional(),
  status: z.enum(['pending', 'sent', 'failed', 'dismissed']).optional(),
  message: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const reminder = await prisma.event_reminders.findFirst({
      where: {
        id,
        garage_id: ctx.garage.id,
        user_id: ctx.user.id,
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            starts_at: true,
            ends_at: true,
          },
        },
      },
    });

    if (!reminder) {
      return NextResponse.json({ error: 'Rappel non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ data: reminder }, { headers: apiHeaders() });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const validation = reminderUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const reminder = await prisma.event_reminders.findFirst({
      where: {
        id,
        garage_id: ctx.garage.id,
        user_id: ctx.user.id,
      },
    });

    if (!reminder) {
      return NextResponse.json({ error: 'Rappel non trouvé' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (validation.data.reminder_time) updateData.reminder_time = new Date(validation.data.reminder_time);
    if (validation.data.channel) updateData.channel = validation.data.channel;
    if (validation.data.status) updateData.status = validation.data.status;
    if (validation.data.message !== undefined) updateData.message = validation.data.message;

    const updated = await prisma.event_reminders.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const reminder = await prisma.event_reminders.findFirst({
      where: {
        id,
        garage_id: ctx.garage.id,
        user_id: ctx.user.id,
      },
    });

    if (!reminder) {
      return NextResponse.json({ error: 'Rappel non trouvé' }, { status: 404 });
    }

    await prisma.event_reminders.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}