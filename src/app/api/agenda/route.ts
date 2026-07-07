import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';
import { agendaCreateSchema } from '@/lib/validations';
import { apiHeaders } from '@/lib/api-headers';

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)));

    const where: Record<string, unknown> = {
      garage_id: ctx.garage.id,
    };

    if (start && end) {
      where.starts_at = {
        gte: new Date(start),
      };
      where.ends_at = {
        lte: new Date(end),
      };
    }

    const [events, total] = await Promise.all([
      prisma.agenda_events.findMany({
        where,
        include: {
          clients: {
            select: {
              first_name: true,
              last_name: true,
              company_name: true,
            },
          },
          vehicles: {
            select: {
              plate: true,
              make: true,
              model: true,
            },
          },
        },
        orderBy: { starts_at: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.agenda_events.count({ where }),
    ]);

    return NextResponse.json({ data: events, total, page, pageSize }, { headers: apiHeaders() });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    const validation = agendaCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const event = await prisma.agenda_events.create({
      data: {
        garage_id: ctx.garage.id,
        title: validation.data.title,
        description: validation.data.description,
        starts_at: new Date(validation.data.starts_at),
        ends_at: new Date(validation.data.ends_at),
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

export async function PUT(request: Request) {
  // Deprecated: use PUT /api/agenda/[id] instead
  return NextResponse.json({ error: 'Use PUT /api/agenda/[id]' }, { status: 400 });
}
