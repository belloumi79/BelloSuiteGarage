import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';
import { renderToBuffer } from '@react-pdf/renderer';
import { DocumentPDF } from '@/components/documents/DocumentPDF';

/**
 * GET /api/documents/[id]/pdf
 * Renders the document as a downloadable PDF file.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const document = await prisma.documents.findFirst({
      where: { id, garage_id: ctx.garage.id },
      include: {
        clients: true,
        vehicles: true,
        document_lines: { orderBy: { position: 'asc' } },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const garage = ctx.garage;
    const client = document.clients;
    const vehicle = document.vehicles;

    const data = {
      garage: {
        name: garage.name,
        legal_name: garage.legal_name,
        address_line1: garage.address_line1,
        address_line2: garage.address_line2,
        postal_code: garage.postal_code,
        city: garage.city,
        phone: garage.phone,
        email: garage.email,
        tax_id: garage.tax_id,
        currency: garage.currency,
        invoice_footer: garage.invoice_footer,
      },
      document: {
        type: document.type,
        number: document.number,
        status: document.status,
        issue_date: document.issue_date,
        due_date: document.due_date,
        notes: document.notes,
        amount_paid: Number(document.amount_paid || 0),
      },
      client: {
        civility: client?.civility,
        first_name: client?.first_name,
        last_name: client?.last_name,
        company_name: client?.company_name,
        address_line1: client?.address_line1,
        postal_code: client?.postal_code,
        city: client?.city,
        tax_id: client?.tax_id,
      },
      vehicle: vehicle
        ? {
            plate: vehicle.plate,
            make: vehicle.make,
            model: vehicle.model,
          }
        : null,
      lines: document.document_lines.map((line) => ({
        description: line.description,
        quantity: Number(line.quantity || 0),
        unit_price: Number(line.unit_price || 0),
        discount_percent: Number(line.discount_percent || 0),
        vat_rate: Number(line.vat_rate || 0),
        total_ht: Number(line.total_ht || 0),
        total_ttc: Number(line.total_ttc || 0),
      })),
      subtotal_ht: Number(document.subtotal_ht || 0),
      total_vat: Number(document.total_vat || 0),
      total_ttc: Number(document.total_ttc || 0),
    };

    const pdfBuffer = await renderToBuffer(<DocumentPDF data={data} />);

    const filename = `${document.type}-${document.number}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'PDF generation failed';
    console.error('PDF error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
