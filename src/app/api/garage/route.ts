import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';
import { apiHeaders } from '@/lib/api-headers';

export async function PUT(request: Request) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: 'Body must be a non-null object' }, { status: 400 });
    }

    const garage = await prisma.garages.update({
      where: { id: ctx.garage.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.legal_name !== undefined && { legal_name: body.legal_name }),
        ...(body.tax_id !== undefined && { tax_id: body.tax_id }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.website !== undefined && { website: body.website }),
        ...(body.address_line1 !== undefined && { address_line1: body.address_line1 }),
        ...(body.address_line2 !== undefined && { address_line2: body.address_line2 }),
        ...(body.postal_code !== undefined && { postal_code: body.postal_code }),
        ...(body.city !== undefined && { city: body.city }),
        ...(body.country !== undefined && { country: body.country }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.vat_default !== undefined && { vat_default: Number(body.vat_default) }),
        ...(body.logo_url !== undefined && { logo_url: body.logo_url }),
        ...(body.invoice_prefix !== undefined && { invoice_prefix: body.invoice_prefix }),
        ...(body.quote_prefix !== undefined && { quote_prefix: body.quote_prefix }),
        ...(body.order_prefix !== undefined && { order_prefix: body.order_prefix }),
        ...(body.next_invoice_number !== undefined && { next_invoice_number: Number(body.next_invoice_number) }),
        ...(body.next_quote_number !== undefined && { next_quote_number: Number(body.next_quote_number) }),
        ...(body.next_order_number !== undefined && { next_order_number: Number(body.next_order_number) }),
        ...(body.invoice_footer !== undefined && { invoice_footer: body.invoice_footer }),
      },
    });

    return NextResponse.json(garage, { headers: apiHeaders() });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
