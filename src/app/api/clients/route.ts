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

    const clients = await prisma.clients.findMany({
      where: {
        garage_id: ctx.garage.id,
        active: true,
        OR: [
          { first_name: { contains: search, mode: 'insensitive' } },
          { last_name: { contains: search, mode: 'insensitive' } },
          { company_name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { mobile: { contains: search, mode: 'insensitive' } },
        ],
      },
      orderBy: { last_name: 'asc' },
    });

    return NextResponse.json(clients);
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const client = await prisma.clients.create({
      data: {
        garage_id: ctx.garage.id,
        type: body.type || 'individual',
        civility: body.civility,
        first_name: body.first_name,
        last_name: body.last_name,
        company_name: body.company_name,
        email: body.email,
        phone: body.phone || '',
        mobile: body.mobile,
        address_line1: body.address_line1,
        address_line2: body.address_line2,
        postal_code: body.postal_code,
        city: body.city,
        tax_id: body.tax_id,
        notes: body.notes,
        payment_terms_days: Number(body.payment_terms_days || 0),
        discount_percent: Number(body.discount_percent || 0),
      },
    });

    return NextResponse.json(client);
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
