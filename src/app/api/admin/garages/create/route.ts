import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/admin';
import { getErrorMessage } from '@/lib/errors';
import { apiHeaders } from '@/lib/api-headers';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    await requireSuperAdmin();
    const body = await request.json();

    const {
      name,
      email,
      legal_name,
      tax_id,
      phone,
      city,
      address_line1,
      subscription_plan,
      trial_days = 30,
    } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Nom et email sont requis' },
        { status: 400, headers: apiHeaders() }
      );
    }

    // Check if email already exists
    const existingGarage = await prisma.garages.findFirst({ where: { email } });
    if (existingGarage) {
      return NextResponse.json(
        { error: 'Un garage avec cet email existe déjà' },
        { status: 400, headers: apiHeaders() }
      );
    }

    const activationCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + trial_days);

    const garage = await prisma.garages.create({
      data: {
        name,
        email,
        legal_name: legal_name || null,
        tax_id: tax_id || null,
        phone: phone || null,
        city: city || null,
        address_line1: address_line1 || null,
        subscription_plan: subscription_plan || 'starter',
        subscription_status: 'trial',
        trial_end_date: trialEndDate,
        activation_code: activationCode,
        vat_default: 19,
        invoice_footer: 'Merci pour votre confiance. BelloGarage S.A.R.L. Tunis.',
        quote_prefix: 'DE',
        order_prefix: 'OR',
        invoice_prefix: 'FA',
      },
    });

    return NextResponse.json({ ...garage, activation_code: activationCode }, { headers: apiHeaders() });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status = message === 'Not authenticated' ? 401 : message === 'Forbidden: super admin only' ? 403 : 500;
    return NextResponse.json({ error: message }, { status, headers: apiHeaders() });
  }
}