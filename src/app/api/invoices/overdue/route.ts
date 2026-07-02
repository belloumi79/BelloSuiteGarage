import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';
import { getErrorMessage } from '@/lib/errors';

/**
 * GET /api/invoices/overdue
 * Returns invoices whose due_date has passed and that are not fully paid,
 * sorted by overdue days descending (most urgent first).
 */
export async function GET() {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const overdue = await prisma.documents.findMany({
      where: {
        garage_id: ctx.garage.id,
        type: 'invoice',
        status: {
          in: ['draft', 'sent', 'partial'],
        },
        due_date: {
          lt: today,
        },
      },
      include: {
        clients: {
          select: {
            first_name: true,
            last_name: true,
            company_name: true,
            phone: true,
            email: true,
          },
        },
        payments: {
          select: { amount: true, payment_date: true },
          orderBy: { payment_date: 'desc' },
        },
      },
      orderBy: { due_date: 'asc' },
    });

    // Enrich with overdue days and remaining balance
    const enriched = overdue.map((doc) => {
      const totalTtc = Number(doc.total_ttc || 0);
      const amountPaid = Number(doc.amount_paid || 0);
      const remaining = Math.max(0, totalTtc - amountPaid);
      const dueDate = doc.due_date ? new Date(doc.due_date) : new Date();
      const overdueDays = Math.max(
        0,
        Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      );

      return {
        id: doc.id,
        number: doc.number,
        issue_date: doc.issue_date,
        due_date: doc.due_date,
        total_ttc: totalTtc,
        amount_paid: amountPaid,
        remaining,
        overdue_days: overdueDays,
        status: doc.status,
        client: doc.clients,
        payments: doc.payments,
      };
    });

    const totalOverdue = enriched.reduce((sum, i) => sum + i.remaining, 0);

    return NextResponse.json({ invoices: enriched, totalOverdue });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
