import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    const existing = await prisma.vehicles.findFirst({
      where: { id, garage_id: ctx.garage.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const vehicle = await prisma.vehicles.update({
      where: { id },
      data: {
        client_id: body.client_id,
        plate: body.plate,
        vin: body.vin,
        make: body.make,
        model: body.model,
        version: body.version,
        year: body.year ? Number(body.year) : null,
        engine: body.engine,
        transmission: body.transmission,
        fuel: body.fuel,
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
