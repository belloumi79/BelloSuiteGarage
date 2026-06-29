import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const garage = await prisma.garages.findFirst();
    if (!garage) return NextResponse.json({ error: 'Garage not initialized' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const vehicles = await prisma.vehicles.findMany({
      where: {
        garage_id: garage.id,
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const garage = await prisma.garages.findFirst();
    if (!garage) return NextResponse.json({ error: 'Garage not initialized' }, { status: 400 });

    const body = await request.json();
    if (!body.client_id) return NextResponse.json({ error: 'client_id is required' }, { status: 400 });

    const vehicle = await prisma.vehicles.create({
      data: {
        garage_id: garage.id,
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
