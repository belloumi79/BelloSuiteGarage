import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendInvoiceReminder } from '@/lib/whatsapp';

/**
 * Cron quotidien — relances de factures impayées par WhatsApp
 *
 * Jours : J+3, J+7, J+15 après échéance
 * Canal : WhatsApp via WPPConnect (si opt-in client + kill-switch global)
 * Fallback : SMS (si configuré)
 *
 * Auth : Bearer ${CRON_SECRET}
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = {
      checked: 0,
      remindersSent: 0,
      remindersSkipped: 0, // pas d'opt-in ou déjà envoyé aujourd'hui
      errors: [] as string[],
    };

    // 1. Trouver toutes les factures impayées dont l'échéance est dépassée
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // On regarde les factures échues depuis au moins 3 jours (J+3 minimum)
    const maxOverdueDate = new Date(todayStart.getTime() - 15 * 24 * 60 * 60 * 1000); // max J+15

    const overdueInvoices = await prisma.documents.findMany({
      where: {
        type: 'invoice',
        status: { in: ['sent', 'partial'] },
        due_date: { gte: maxOverdueDate, lt: todayStart },
      },
      include: {
        clients: {
          select: {
            id: true,
            company_name: true,
            first_name: true,
            last_name: true,
            mobile: true,
            phone: true,
            tax_id: true,
            whatsapp_opt_in: true,
          },
        },
        garages: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    for (const invoice of overdueInvoices) {
      results.checked++;
      const client = invoice.clients;
      const garage = invoice.garages;
      const phone = client.mobile || client.phone || '';

      if (!phone) continue;

      // Calcul du jour de relance (J+3, J+7, J+15)
      if (!invoice.due_date) continue;
      const dueDate = new Date(invoice.due_date);
      const overdueMs = todayStart.getTime() - dueDate.getTime();
      const overdueDays = Math.floor(overdueMs / (1000 * 60 * 60 * 24));

      let reminderDay: number | null = null;
      if (overdueDays >= 15 && overdueDays < 16) reminderDay = 15;
      else if (overdueDays >= 7 && overdueDays < 8) reminderDay = 7;
      else if (overdueDays >= 3 && overdueDays < 4) reminderDay = 3;
      else continue; // pas un jour de relance

      // Vérifier qu'on a pas déjà envoyé ce jour-là aujourd'hui
      const alreadySent = await prisma.whatsapp_messages.findFirst({
        where: {
          garage_id: garage.id,
          client_id: client.id,
          document_id: invoice.id,
          template_key: `invoice_reminder_j${reminderDay}`,
          sent_at: { gte: todayStart, lt: todayEnd },
        },
      });
      if (alreadySent) {
        results.remindersSkipped++;
        continue;
      }

      // Nom du client
      const clientName = client.company_name ||
        `${client.first_name || ''} ${client.last_name || ''}`.trim() ||
        'Client';

      // Montant restant
      const totalTtc = Number(invoice.total_ttc || 0);
      const amountPaid = Number(invoice.amount_paid || 0);
      const remaining = Math.max(0, totalTtc - amountPaid);

      // URL PDF (base URL configurable)
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bellosuite.tn';
      const pdfUrl = `${baseUrl}/invoices/${invoice.number}/pdf`;

      // Envoyer la relance WhatsApp
      try {
        const sent = await sendInvoiceReminder({
          garageId: garage.id,
          clientId: client.id,
          documentId: invoice.id,
          phone,
          garageName: garage.name,
          clientName,
          invoiceNumber: invoice.number,
          clientTaxId: client.tax_id,
          amountTtc: remaining,
          dueDate: dueDate.toLocaleDateString('fr-TN'),
          penalties: null, // TODO: gérer pénalités configurables
          pdfUrl,
          reminderDay,
        });

        if (sent) {
          results.remindersSent++;
        } else {
          results.remindersSkipped++;
        }
      } catch (err) {
        results.errors.push(
          `Invoice ${invoice.number} J+${reminderDay}: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    }

    return NextResponse.json(results);
  } catch (err: unknown) {
    console.error('Invoice reminders cron error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
