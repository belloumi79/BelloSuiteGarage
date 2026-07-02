import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';
import { getErrorMessage } from '@/lib/errors';

/**
 * GET /api/accounting/export?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns a CSV file with three sections:
 *   1. Journal des ventes  — one row per invoice (HT, VAT by rate, TTC)
 *   2. Encaissements       — one row per payment (method, amount)
 *   3. Avoirs              — one row per credit_note
 *
 * The response Content-Type is text/csv; charset=utf-8 so the browser
 * triggers a file download.
 */
export async function GET(request: Request) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';

    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) {
      const endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.lte = endDate;
    }

    // ── 1. Journal des ventes ──────────────────────────────────────
    const invoices = await prisma.documents.findMany({
      where: {
        garage_id: ctx.garage.id,
        type: 'invoice',
        status: { not: 'cancelled' },
        ...(Object.keys(dateFilter).length > 0 ? { issue_date: dateFilter } : {}),
      },
      include: {
        clients: { select: { last_name: true, company_name: true, tax_id: true } },
        document_lines: { select: { vat_rate: true, total_ht: true, total_vat: true, total_ttc: true } },
      },
      orderBy: { issue_date: 'asc' },
    });

    // Group lines by VAT rate per invoice
    const salesRows: string[] = [];
    for (const inv of invoices) {
      const client = inv.clients;
      const clientName = client?.company_name || `${client?.last_name || ''}`.trim();
      const vatByRate = new Map<string, { ht: number; vat: number }>();
      let totalHt = 0;
      let totalVat = 0;

      for (const line of inv.document_lines) {
        const rate = String(Number(line.vat_rate || 0));
        const bucket = vatByRate.get(rate) || { ht: 0, vat: 0 };
        bucket.ht += Number(line.total_ht || 0);
        bucket.vat += Number(line.total_vat || 0);
        vatByRate.set(rate, bucket);
        totalHt += Number(line.total_ht || 0);
        totalVat += Number(line.total_vat || 0);
      }

      // One row per unique VAT rate in this invoice
      if (vatByRate.size === 0) {
        salesRows.push(
          csvLine([
            inv.issue_date?.toISOString().split('T')[0] || '',
            inv.number,
            clientName,
            client?.tax_id || '',
            '19',
            fmt(totalHt),
            fmt(totalVat),
            fmt(totalHt + totalVat),
          ])
        );
      } else {
        for (const [rate, vals] of vatByRate) {
          salesRows.push(
            csvLine([
              inv.issue_date?.toISOString().split('T')[0] || '',
              inv.number,
              clientName,
              client?.tax_id || '',
              rate,
              fmt(vals.ht),
              fmt(vals.vat),
              fmt(vals.ht + vals.vat),
            ])
          );
        }
      }
    }

    // ── 2. Encaissements ────────────────────────────────────────────
    const payments = await prisma.payments.findMany({
      where: {
        garage_id: ctx.garage.id,
        ...(Object.keys(dateFilter).length > 0 ? { payment_date: dateFilter } : {}),
      },
      include: {
        documents: { select: { number: true } },
      },
      orderBy: { payment_date: 'asc' },
    });

    const paymentRows: string[] = [];
    for (const p of payments) {
      paymentRows.push(
        csvLine([
          p.payment_date.toISOString().split('T')[0],
          p.documents?.number || '',
          p.method,
          fmt(Number(p.amount)),
          p.reference || '',
        ])
      );
    }

    // ── 3. Avoirs (credit notes) ──────────────────────────────────
    const creditNotes = await prisma.documents.findMany({
      where: {
        garage_id: ctx.garage.id,
        type: 'credit_note',
        status: { not: 'cancelled' },
        ...(Object.keys(dateFilter).length > 0 ? { issue_date: dateFilter } : {}),
      },
      include: {
        clients: { select: { last_name: true, company_name: true } },
      },
      orderBy: { issue_date: 'asc' },
    });

    const creditRows: string[] = [];
    for (const cn of creditNotes) {
      creditRows.push(
        csvLine([
          cn.issue_date?.toISOString().split('T')[0] || '',
          cn.number,
          cn.clients?.company_name || cn.clients?.last_name || '',
          fmt(Number(cn.subtotal_ht)),
          fmt(Number(cn.total_vat)),
          fmt(Number(cn.total_ttc)),
        ])
      );
    }

    // ── Assemble CSV ───────────────────────────────────────────────
    const csvParts: string[] = [];

    csvParts.push('=== JOURNAL DES VENTES ===');
    csvParts.push(
      csvLine([
        'Date',
        'N° Facture',
        'Client',
        'Matricule Fiscal',
        'Taux TVA %',
        'HT',
        'TVA',
        'TTC',
      ])
    );
    csvParts.push(...salesRows);
    csvParts.push('');

    csvParts.push('=== ENCAISSEMENTS ===');
    csvParts.push(
      csvLine([
        'Date',
        'N° Facture',
        'Mode',
        'Montant',
        'Référence',
      ])
    );
    csvParts.push(...paymentRows);
    csvParts.push('');

    csvParts.push('=== AVOIRS ===');
    csvParts.push(
      csvLine([
        'Date',
        'N° Avoir',
        'Client',
        'HT',
        'TVA',
        'TTC',
      ])
    );
    csvParts.push(...creditRows);

    const csv = csvParts.join('\n');
    const filename = `export_comptable_${from || 'all'}_to_${to || 'all'}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function csvLine(fields: string[]): string {
  return fields.map((f) => `"${f.replace(/"/g, '""')}"`).join(';');
}

function fmt(n: number): string {
  return n.toFixed(3);
}
