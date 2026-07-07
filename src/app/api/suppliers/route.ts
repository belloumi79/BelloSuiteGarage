import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';
import { apiHeaders } from '@/lib/api-headers';

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
        { name: { contains: search, mode: 'insensitive' as const } },
        { contact_name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
      ],
    };

    const [suppliers, total] = await Promise.all([
      prisma.suppliers.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.suppliers.count({ where }),
    ]);

    return NextResponse.json({ data: suppliers, total, page, pageSize }, { headers: apiHeaders() });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'Le nom du fournisseur est requis' }, { status: 400 });
    }

    const supplier = await prisma.suppliers.create({
      data: {
        garage_id: ctx.garage.id,
        name: body.name.trim(),
        contact_name: body.contact_name || null,
        email: body.email || null,
        phone: body.phone || null,
        website: body.website || null,
        address_line1: body.address_line1 || null,
        address_line2: body.address_line2 || null,
        postal_code: body.postal_code || null,
        city: body.city || null,
        country: body.country || null,
        tax_id: body.tax_id || null,
        payment_terms_days: body.payment_terms_days != null ? Number(body.payment_terms_days) : 30,
        notes: body.notes || null,
        active: body.active !== undefined ? body.active : true,
      },
    });

    return NextResponse.json(supplier);
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
