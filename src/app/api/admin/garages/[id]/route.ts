import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/admin';
import { getErrorMessage } from '@/lib/errors';
import { apiHeaders } from '@/lib/api-headers';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.subscription_status !== undefined) data.subscription_status = body.subscription_status;
    if (body.subscription_plan !== undefined) data.subscription_plan = body.subscription_plan;
    if (body.subscription_renewal_date !== undefined) data.subscription_renewal_date = new Date(body.subscription_renewal_date);

    if (body.subscription_status === 'suspended') {
      data.suspended_at = new Date();
    } else if (body.subscription_status === 'active' || body.subscription_status === 'trial') {
      data.suspended_at = null;
    }

    const garage = await prisma.garages.update({ where: { id }, data });
    return NextResponse.json(garage, { headers: apiHeaders() });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status = message === 'Forbidden: super admin only' ? 403 : 500;
    return NextResponse.json({ error: message }, { status, headers: apiHeaders() });
  }
}
