import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';
import { apiHeaders } from '@/lib/api-headers';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (ctx.role !== 'owner') {
      return NextResponse.json({ error: 'Seul le propriétaire peut modifier les rôles' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { role, active } = body;

    const member = await prisma.garage_members.findUnique({ where: { id } });
    if (!member || member.garage_id !== ctx.garage.id) {
      return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 });
    }

    if (member.user_id === ctx.user.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas modifier votre propre rôle' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (role !== undefined) data.role = role;
    if (active !== undefined) data.active = active;

    const updated = await prisma.garage_members.update({ where: { id }, data });

    return NextResponse.json(updated, { headers: apiHeaders() });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (ctx.role !== 'owner') {
      return NextResponse.json({ error: 'Seul le propriétaire peut supprimer des membres' }, { status: 403 });
    }

    const { id } = await params;

    const member = await prisma.garage_members.findUnique({ where: { id } });
    if (!member || member.garage_id !== ctx.garage.id) {
      return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 });
    }

    if (member.user_id === ctx.user.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas vous supprimer vous-même' }, { status: 400 });
    }

    await prisma.garage_members.delete({ where: { id } });

    return NextResponse.json({ success: true }, { headers: apiHeaders() });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
