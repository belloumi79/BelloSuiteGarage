import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';
import { apiHeaders } from '@/lib/api-headers';

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (ctx.role !== 'owner') {
      return NextResponse.json({ error: 'Seul le propriétaire peut inviter des membres' }, { status: 403 });
    }

    const { email, role } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const memberRole = role || 'mechanic';

    const invitedUser = await prisma.users.findUnique({ where: { email } });
    if (!invitedUser) {
      return NextResponse.json({ error: 'Utilisateur introuvable. La personne doit d\'abord créer un compte.' }, { status: 404 });
    }

    const existing = await prisma.garage_members.findUnique({
      where: { garage_id_user_id: { garage_id: ctx.garage.id, user_id: invitedUser.id } },
    });

    if (existing) {
      if (existing.active) {
        return NextResponse.json({ error: 'Cet utilisateur est déjà membre du garage' }, { status: 409 });
      }
      const updated = await prisma.garage_members.update({
        where: { id: existing.id },
        data: { active: true, role: memberRole as 'owner' | 'mechanic' | 'cashier' | 'viewer' },
      });
      return NextResponse.json(updated, { headers: apiHeaders() });
    }

    const member = await prisma.garage_members.create({
      data: {
        garage_id: ctx.garage.id,
        user_id: invitedUser.id,
        role: memberRole as 'owner' | 'mechanic' | 'cashier' | 'viewer',
        joined_at: new Date(),
      },
    });

    return NextResponse.json(member, { headers: apiHeaders() });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
