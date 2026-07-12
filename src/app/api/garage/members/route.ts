import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';
import { apiHeaders } from '@/lib/api-headers';

export async function GET() {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (ctx.role !== 'owner') {
      return NextResponse.json({ error: 'Seul le propriétaire peut gérer les membres' }, { status: 403 });
    }

    const members = await prisma.garage_members.findMany({
      where: { garage_id: ctx.garage.id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            created_at: true,
          },
        },
      },
      orderBy: { invited_at: 'asc' },
    });

    const result = members.map(m => ({
      id: m.id,
      user_id: m.user_id,
      email: m.users.email,
      role: m.role,
      active: m.active,
      joined_at: m.joined_at,
    }));

    return NextResponse.json(result, { headers: apiHeaders() });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
