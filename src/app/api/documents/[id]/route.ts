import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { document_type, document_status } from '@prisma/client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const document = await prisma.documents.findUnique({
      where: { id },
      include: {
        clients: {
          select: {
            first_name: true,
            last_name: true,
            company_name: true,
            address_line1: true,
            address_line2: true,
            postal_code: true,
            city: true,
            phone: true,
            tax_id: true,
          },
        },
        vehicles: {
          select: {
            plate: true,
            make: true,
            model: true,
            version: true,
            fuel: true,
            color: true,
          },
        },
        document_lines: {
          orderBy: { position: 'asc' },
        },
        payments: true,
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { transitionTo, status, notes, lines } = body;

    const originalDoc = await prisma.documents.findUnique({
      where: { id },
      include: { document_lines: true },
    });

    if (!originalDoc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // A. Handles document type conversion (Devis -> OR -> Facture)
    if (transitionTo) {
      if (originalDoc.status === 'cancelled' || originalDoc.status === 'paid') {
        return NextResponse.json({ error: 'Document cannot be converted' }, { status: 400 });
      }

      const allowedTransitions: Record<string, document_type> = {
        quote: 'repair_order',
        repair_order: 'invoice',
      };

      const targetType = allowedTransitions[originalDoc.type];
      if (transitionTo !== targetType) {
        return NextResponse.json({ error: 'Invalid document transition' }, { status: 400 });
      }

      const result: any[] = await prisma.$queryRawUnsafe(
        `SELECT public.next_document_number($1, $2) as num`,
        originalDoc.garage_id,
        targetType
      );
      const docNumber = result[0]?.num || `${targetType.toUpperCase()}-${Date.now()}`;

      const newDoc = await prisma.$transaction(async tx => {
        const created = await tx.documents.create({
          data: {
            garage_id: originalDoc.garage_id,
            type: targetType,
            number: docNumber,
            status: (targetType === 'invoice' ? 'sent' : 'draft') as document_status,
            client_id: originalDoc.client_id,
            vehicle_id: originalDoc.vehicle_id,
            source_document_id: originalDoc.id,
            notes: originalDoc.notes,
            subtotal_ht: originalDoc.subtotal_ht,
            total_vat: originalDoc.total_vat,
            total_ttc: originalDoc.total_ttc,
            document_lines: {
              create: originalDoc.document_lines.map(line => ({
                garage_id: line.garage_id,
                item_id: line.item_id,
                line_type: line.line_type,
                description: line.description,
                quantity: line.quantity,
                unit: line.unit,
                unit_price: line.unit_price,
                discount_percent: line.discount_percent,
                vat_rate: line.vat_rate,
                total_ht: line.total_ht,
                total_vat: line.total_vat,
                total_ttc: line.total_ttc,
                position: line.position,
              })),
            },
          },
          include: {
            document_lines: true,
          },
        });

        await tx.documents.update({
          where: { id: originalDoc.id },
          data: {
            status: 'cancelled',
          },
        });

        if (targetType === 'invoice') {
          for (const line of created.document_lines) {
            if (line.item_id && line.line_type === 'part') {
              await tx.stock_movements.create({
                data: {
                  garage_id: originalDoc.garage_id,
                  item_id: line.item_id,
                  movement_type: 'sale_out',
                  quantity: Number(line.quantity),
                  document_id: created.id,
                  notes: `Stock sorti suite à conversion Facture N° ${created.number}`,
                },
              });
            }
          }
        }

        return created;
      });

      return NextResponse.json({ message: 'Document transitioned successfully', document: newDoc });
    }

    // B. Handle regular update (status, notes, and lines)
    let updateData: any = {};
    if (status) updateData.status = status as document_status;
    if (notes !== undefined) updateData.notes = notes;

    if (lines) {
      // Re-calculate totals
      let subtotal_ht = 0;
      let total_vat = 0;
      let total_ttc = 0;

      // First, delete old lines
      await prisma.document_lines.deleteMany({ where: { document_id: id } });

      // Build new lines list
      const formattedLines = lines.map((line: any, index: number) => {
        const qty = Number(line.quantity || 1);
        const price = Number(line.unit_price || 0);
        const disc = Number(line.discount_percent || 0);
        const vat = Number(line.vat_rate || 19.0);

        const priceAfterDiscount = price * (1 - disc / 100);
        const lineHT = qty * priceAfterDiscount;
        const lineVAT = lineHT * (vat / 100);
        const lineTTC = lineHT + lineVAT;

        subtotal_ht += lineHT;
        total_vat += lineVAT;
        total_ttc += lineTTC;

        return {
          garage_id: originalDoc.garage_id,
          document_id: id,
          item_id: line.item_id || null,
          line_type: line.line_type || 'part',
          description: line.description || 'Ligne',
          quantity: qty,
          unit: line.unit || 'pcs',
          unit_price: price,
          discount_percent: disc,
          vat_rate: vat,
          total_ht: lineHT,
          total_vat: lineVAT,
          total_ttc: lineTTC,
          position: index,
        };
      });

      // Insert new lines
      await prisma.document_lines.createMany({ data: formattedLines });

      updateData.subtotal_ht = subtotal_ht;
      updateData.total_vat = total_vat;
      updateData.total_ttc = total_ttc;
    }

    const updatedDocument = await prisma.documents.update({
      where: { id },
      data: updateData,
      include: {
        document_lines: true,
      },
    });

    return NextResponse.json(updatedDocument);
  } catch (error: any) {
    console.error('Error updating document:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const document = await prisma.documents.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (document.type === 'invoice' && document.status === 'paid') {
      return NextResponse.json({ error: 'Cannot delete a paid invoice' }, { status: 400 });
    }

    await prisma.documents.delete({ where: { id } });
    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
