import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';
import { apiHeaders } from '@/lib/api-headers';

export async function GET() {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const garage = ctx.garage;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // 1. Monthly revenue (CA du mois) - Sum of payments in the current month
    const paymentsThisMonth = await prisma.payments.aggregate({
      where: {
        garage_id: garage.id,
        payment_date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: {
        amount: true,
      },
    });
    const monthlyRevenue = Number(paymentsThisMonth._sum.amount || 0);

    // 2. Unpaid invoices total (Factures impayées)
    const unpaidInvoices = await prisma.documents.findMany({
      where: {
        garage_id: garage.id,
        type: 'invoice',
        status: {
          in: ['draft', 'sent', 'partial'],
        },
      },
      select: {
        total_ttc: true,
        amount_paid: true,
      },
    });
    const totalUnpaid = unpaidInvoices.reduce(
      (acc, doc) => acc + (Number(doc.total_ttc || 0) - Number(doc.amount_paid || 0)),
      0
    );

    // 3. Active Repair Orders (OR en cours)
    const activeORCount = await prisma.documents.count({
      where: {
        garage_id: garage.id,
        type: 'repair_order',
        status: {
          in: ['draft', 'sent', 'partial'],
        },
      },
    });

    // 4. Low stock items count
    const allParts = await prisma.items.findMany({
      where: {
        garage_id: garage.id,
        type: 'part',
        active: true,
      },
      select: {
        id: true,
        name: true,
        reference: true,
        stock_qty: true,
        stock_min: true,
      },
    });
    const lowStockItems = allParts.filter(
      (it) => Number(it.stock_qty) <= Number(it.stock_min)
    );

    // 5. Today's appointments
    const todayAppointments = await prisma.agenda_events.findMany({
      where: {
        garage_id: garage.id,
        starts_at: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      include: {
        clients: {
          select: {
            first_name: true,
            last_name: true,
            company_name: true,
          },
        },
        vehicles: {
          select: {
            plate: true,
            make: true,
            model: true,
          },
        },
      },
      orderBy: {
        starts_at: 'asc',
      },
    });

    // 6. Recent sales for chart
    const recentSales = await prisma.payments.findMany({
      where: {
        garage_id: garage.id,
      },
      orderBy: {
        payment_date: 'desc',
      },
      take: 10,
    });

    return NextResponse.json({
      garage,
      monthlyRevenue,
      totalUnpaid,
      activeORCount,
      lowStock: lowStockItems,
      todayAppointments,
      recentSales: recentSales.map(s => ({
        id: s.id,
        amount: Number(s.amount),
          date: s.payment_date.toISOString().split('T')[0],
        method: s.method,
      })),
    }, { headers: apiHeaders() });
  } catch (err: unknown) {
    console.error('Dashboard error:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
