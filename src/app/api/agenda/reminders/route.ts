import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';
import { apiHeaders } from '@/lib/api-headers';
import { z } from 'zod';

const reminderCreateSchema = z.object({
  event_id: z.string().uuid(),
  reminder_time: z.string().datetime(),
  channel: z.enum(['in_app', 'sms', 'whatsapp', 'email']).default('in_app'),
  message: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');

    const where: Record<string, unknown> = {
      garage_id: ctx.garage.id,
      user_id: ctx.user.id,
    };

    if (eventId) {
      where.event_id = eventId;
    }

    const reminders = await prisma.event_reminders.findMany({
      where,
      orderBy: { reminder_time: 'asc' },
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

    return NextResponse.json({ data: reminders }, { headers: apiHeaders() });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    // Validate input
    const validation = reminderCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Verify event exists and belongs to garage
    const event = await prisma.agenda_events.findFirst({
      where: {
        id: validation.data.event_id,
        garage_id: ctx.garage.id,
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Événement non trouvé' }, { status: 404 });
    }

    const reminder = await prisma.event_reminders.create({
      data: {
        garage_id: ctx.garage.id,
        event_id: validation.data.event_id,
        user_id: ctx.user.id,
        reminder_time: new Date(validation.data.reminder_time),
        channel: validation.data.channel,
        message: validation.data.message,
        status: 'pending',
      },
    });

    return NextResponse.json(reminder);
  } catch (err: unknown) {
    console.error('Error creating reminder:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}