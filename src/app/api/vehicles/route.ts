import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const vehicles = await prisma.vehicles.findMany({
      where: {
        garage_id: ctx.garage.id,
        OR: [
          { plate: { contains: search, mode: 'insensitive' } },
          { make: { contains: search, mode: 'insensitive' } },
          { model: { contains: search, mode: 'insensitive' } },
          { vin: { contains: search, mode: 'insensitive' } },
        ],
      },
      include: {
        clients: {
          select: {
            first_name: true,
            last_name: true,
            company_name: true,
          },
        },
      },
      orderBy: { plate: 'asc' },
    });

    return NextResponse.json(vehicles);
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.client_id) return NextResponse.json({ error: 'client_id is required' }, { status: 400 });

    const vehicle = await prisma.vehicles.create({
      data: {
        garage_id: ctx.garage.id,
        client_id: body.client_id,
        plate: body.plate || '',
        vin: body.vin,
        make: body.make || '',
        model: body.model || '',
        version: body.version,
        year: body.year ? Number(body.year) : null,
        engine: body.engine,
        transmission: body.transmission,
        fuel: body.fuel || '',
        color: body.color,
        mileage: body.mileage ? Number(body.mileage) : null,
        notes: body.notes,
      },
    });

    return NextResponse.json(vehicle);
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
