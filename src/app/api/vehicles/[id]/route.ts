import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if vehicle is referenced by documents
    const docCount = await prisma.documents.count({ where: { vehicle_id: id } });
    if (docCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vehicle with repair history. Please delete or reassign documents first.' },
        { status: 400 }
      );
    }

    await prisma.vehicles.delete({ where: { id } });
    return NextResponse.json({ message: 'Vehicle deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
