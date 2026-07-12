import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/admin';
import { getErrorMessage } from '@/lib/errors';
import { apiHeaders } from '@/lib/api-headers';
import crypto from 'crypto';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();
    const { id } = await params;

    const code = crypto.randomBytes(4).toString('hex').toUpperCase();

    const garage = await prisma.garages.update({
      where: { id },
      data: {
        activation_code: code,
        subscription_status: 'trial',
        suspended_at: null,
      },
    });

    return NextResponse.json({ activation_code: garage.activation_code }, { headers: apiHeaders() });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status = message === 'Forbidden: super admin only' ? 403 : 500;
    return NextResponse.json({ error: message }, { status, headers: apiHeaders() });
  }
}
