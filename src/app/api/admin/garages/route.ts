import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/admin';
import { getErrorMessage } from '@/lib/errors';
import { apiHeaders } from '@/lib/api-headers';

export async function GET() {
  try {
    await requireSuperAdmin();

    const garages = await prisma.garages.findMany({
      include: {
        garage_members: {
          where: { role: 'owner' },
          include: {
            users: { select: { email: true } },
          },
        },
        _count: { select: { garage_members: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const result = garages.map(g => ({
      id: g.id,
      name: g.name,
      email: g.email,
      city: g.city,
      subscription_plan: g.subscription_plan,
      subscription_status: g.subscription_status,
      trial_end_date: g.trial_end_date,
      activation_code: g.activation_code,
      suspended_at: g.suspended_at,
      created_at: g.created_at,
      members_count: g._count.garage_members,
      owner_email: g.garage_members[0]?.users.email || null,
    }));

    return NextResponse.json(result, { headers: apiHeaders() });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status = message === 'Not authenticated' ? 401 : message === 'Forbidden: super admin only' ? 403 : 500;
    return NextResponse.json({ error: message }, { status, headers: apiHeaders() });
  }
}
