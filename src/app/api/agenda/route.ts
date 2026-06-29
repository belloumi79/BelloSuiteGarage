import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const garage = await prisma.garages.findFirst();
    if (!garage) return NextResponse.json({ error: 'Garage not initialized' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    const whereClause: any = {
      garage_id: garage.id,
    };

    if (start && end) {
      whereClause.starts_at = {
        gte: new Date(start),
      };
      whereClause.ends_at = {
        lte: new Date(end),
      };
    }

    const events = await prisma.agenda_events.findMany({
      where: whereClause,
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
    });

    return NextResponse.json(events);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const garage = await prisma.garages.findFirst();
    if (!garage) return NextResponse.json({ error: 'Garage not initialized' }, { status: 400 });

    const body = await request.json();
    const { title, description, starts_at, ends_at, client_id, vehicle_id, status, color } = body;

    if (!title || !starts_at || !ends_at) {
      return NextResponse.json({ error: 'Title, start and end dates are required' }, { status: 400 });
    }

    const event = await prisma.agenda_events.create({
      data: {
        garage_id: garage.id,
        title,
        description,
        starts_at: new Date(starts_at),
        ends_at: new Date(ends_at),
        client_id: client_id || null,
        vehicle_id: vehicle_id || null,
        status: status || 'planned',
        color: color || '#3b82f6',
      },
    });

    return NextResponse.json(event);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, title, description, starts_at, ends_at, client_id, vehicle_id, status, color } = body;

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const event = await prisma.agenda_events.update({
      where: { id },
      data: {
        title,
        description,
        starts_at: starts_at ? new Date(starts_at) : undefined,
        ends_at: ends_at ? new Date(ends_at) : undefined,
        client_id: client_id || null,
        vehicle_id: vehicle_id || null,
        status,
        color,
      },
    });

    return NextResponse.json(event);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    await prisma.agenda_events.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
