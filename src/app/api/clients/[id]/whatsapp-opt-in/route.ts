import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';
import { apiHeaders } from '@/lib/api-headers';

/**
 * POST /api/clients/:id/whatsapp-opt-in
 * Bascule l'opt-in WhatsApp du client (Loi 2004-5 / INPDP — consentement explicite).
 * Le kill-switch global reste côté garage (WHATSAPP_ENABLED), vérifié à l'envoi.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (typeof body !== 'object' || body === null || typeof body.whatsapp_opt_in !== 'boolean') {
      return NextResponse.json(
        { error: 'whatsapp_opt_in (boolean) requis' },
        { status: 400 }
      );
    }

    const client = await prisma.clients.findFirst({
      where: { id, garage_id: ctx.garage.id },
    });
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const updated = await prisma.clients.update({
      where: { id },
      data: { whatsapp_opt_in: body.whatsapp_opt_in },
    });

    return NextResponse.json(updated, { headers: apiHeaders() });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
