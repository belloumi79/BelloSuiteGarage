import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';
import { document_status, payment_method } from '@prisma/client';

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { document_id, amount, method, reference, notes } = body;

    if (!document_id || !amount) {
      return NextResponse.json({ error: 'document_id and amount are required' }, { status: 400 });
    }

    const paymentAmount = Number(amount);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return NextResponse.json({ error: 'amount must be greater than zero' }, { status: 400 });
    }

    const document = await prisma.documents.findFirst({
      where: { id: document_id, garage_id: ctx.garage.id },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (document.type !== 'invoice') {
      return NextResponse.json({ error: 'Payments can only be recorded for invoices' }, { status: 400 });
    }

    const totalTtc = Number(document.total_ttc || 0);
    const amountPaid = Number(document.amount_paid || 0);
    const remaining = totalTtc - amountPaid;

    if (remaining <= 0) {
      return NextResponse.json({ error: 'Invoice is already paid' }, { status: 400 });
    }

    if (paymentAmount > remaining + 0.001) {
      return NextResponse.json({ error: 'Payment amount exceeds remaining balance' }, { status: 400 });
    }

    const nextPaid = amountPaid + paymentAmount;
    const nextStatus: document_status = nextPaid >= totalTtc - 0.001 ? 'paid' : 'partial';

    const payment = await prisma.$transaction(async tx => {
      const createdPayment = await tx.payments.create({
        data: {
          garage_id: ctx.garage.id,
          document_id,
          amount: paymentAmount,
          method: (method || 'cash') as payment_method,
          reference: reference || null,
          notes: notes || null,
        },
      });

      await tx.documents.update({
        where: { id: document_id },
        data: {
          amount_paid: nextPaid,
          status: nextStatus,
        },
      });

      await tx.treasury_entries.create({
        data: {
          garage_id: ctx.garage.id,
          entry_date: new Date(),
          direction: 'in',
          amount: paymentAmount,
          method: (method || 'cash') as payment_method,
          category: 'sale',
          reference: reference || null,
          payment_id: createdPayment.id,
          document_id: document.id,
          notes: `Paiement reçu Facture N° ${document.number}`,
        },
      });

      return createdPayment;
    });

    return NextResponse.json(payment);
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
