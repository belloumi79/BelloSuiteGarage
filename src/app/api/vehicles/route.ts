import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';
import { vehicleCreateSchema, vehicleUpdateSchema } from '@/lib/validations';

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)));

    const where = {
      garage_id: ctx.garage.id,
      OR: [
        { plate: { contains: search, mode: 'insensitive' as const } },
        { make: { contains: search, mode: 'insensitive' as const } },
        { model: { contains: search, mode: 'insensitive' as const } },
        { vin: { contains: search, mode: 'insensitive' as const } },
      ],
    };

    const [vehicles, total] = await Promise.all([
      prisma.vehicles.findMany({
        where,
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
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.vehicles.count({ where }),
    ]);

    return NextResponse.json({ data: vehicles, total, page, pageSize });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    // Validate input with Zod
    const validation = vehicleCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const vehicle = await prisma.vehicles.create({
      data: {
        garage_id: ctx.garage.id,
        ...validation.data,
        plate: validation.data.plate || '',
        make: validation.data.make || '',
        fuel: validation.data.fuel || '',
        year: validation.data.year ?? null,
        mileage: validation.data.mileage ?? null,
      },
    });

    return NextResponse.json(vehicle);
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
