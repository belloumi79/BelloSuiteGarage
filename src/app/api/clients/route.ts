import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';
import { clientCreateSchema, clientUpdateSchema } from '@/lib/validations';

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
      active: true,
      OR: [
        { first_name: { contains: search, mode: 'insensitive' as const } },
        { last_name: { contains: search, mode: 'insensitive' as const } },
        { company_name: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
        { mobile: { contains: search, mode: 'insensitive' as const } },
      ],
    };

    const [clients, total] = await Promise.all([
      prisma.clients.findMany({
        where,
        orderBy: { last_name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.clients.count({ where }),
    ]);

    return NextResponse.json({ data: clients, total, page, pageSize });
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
    const validation = clientCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const client = await prisma.clients.create({
      data: {
        garage_id: ctx.garage.id,
        ...validation.data,
        phone: validation.data.phone || '',
        payment_terms_days: Number(validation.data.payment_terms_days || 0),
        discount_percent: Number(validation.data.discount_percent || 0),
      },
    });

    return NextResponse.json(client);
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
