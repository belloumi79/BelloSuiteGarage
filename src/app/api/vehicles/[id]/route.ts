import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';
import { vehicleUpdateSchema } from '@/lib/validations';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    if (body.vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(body.vin)) {
      return NextResponse.json({ error: 'Format VIN invalide (17 caractères, sans I/O/Q)' }, { status: 400 });
    }

    const validation = vehicleUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await prisma.vehicles.findFirst({
      where: { id, garage_id: ctx.garage.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const vehicle = await prisma.vehicles.update({
      where: { id },
      data: {
        ...validation.data,
        year: validation.data.year ?? null,
        mileage: validation.data.mileage ?? null,
      },
    });

    return NextResponse.json(vehicle);
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

    const existing = await prisma.vehicles.findFirst({
      where: { id, garage_id: ctx.garage.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Check if vehicle is referenced by documents
    const docCount = await prisma.documents.count({ where: { vehicle_id: id, garage_id: ctx.garage.id } });
    if (docCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vehicle with repair history. Please delete or reassign documents first.' },
        { status: 400 }
      );
    }

    await prisma.vehicles.delete({ where: { id } });
    return NextResponse.json({ message: 'Vehicle deleted successfully' });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
