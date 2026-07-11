import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';
import { document_type, document_status } from '@prisma/client';
import { documentCreateSchema } from '@/lib/validations';
import { apiHeaders } from '@/lib/api-headers';

/**
 * Prisma serializes Decimal values as strings in JSON.
 * When the client re-sends these values, numeric fields arrive as
 * strings (e.g. "19.00") and strict Zod schemas reject them.
 * This helper recursively converts numeric-looking strings back to
 * numbers so validation succeeds without weakening type safety.
 */
function coerceNumericStrings(value: unknown): unknown {
    if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)) {
        return Number(value);
    }
    if (Array.isArray(value)) {
        return value.map(coerceNumericStrings);
    }
    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
        return Object.fromEntries(
            Object.entries(value).map(([k, v]) => [k, coerceNumericStrings(v)])
        );
    }
    return value;
}

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || '';
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)));

    const where: Record<string, unknown> = {
      garage_id: ctx.garage.id,
    };

    if (type) {
      where.type = type as document_type;
    }

    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' as const } },
        { clients: { last_name: { contains: search, mode: 'insensitive' as const } } },
        { clients: { first_name: { contains: search, mode: 'insensitive' as const } } },
        { vehicles: { plate: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    const [documents, total] = await Promise.all([
      prisma.documents.findMany({
        where,
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
          payments: {
            orderBy: { payment_date: 'desc' },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.documents.count({ where }),
    ]);

    return NextResponse.json({ data: documents, total, page, pageSize }, { headers: apiHeaders() });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let rawBody: Record<string, unknown> = {};
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const body = coerceNumericStrings(rawBody);

    // Validate input with Zod
    const validation = documentCreateSchema.safeParse(body);
    if (!validation.success) {
      const issues = validation.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
        code: i.code,
        received: (i as unknown as Record<string, unknown>).received,
      }));
      const responsePayload = {
        error: 'Validation failed',
        issues,
        receivedBody: rawBody,
      };
      console.error('[documents POST]', JSON.stringify(responsePayload, null, 2));
      return NextResponse.json(responsePayload, { status: 400 });
    }

    const { type, client_id, vehicle_id, notes, lines } = validation.data;

    // Call public.next_document_number helper via prisma queryRaw to get formatted sequence number
    let docNumber = '';
    try {
      const result: { num: string }[] = await prisma.$queryRawUnsafe(
        `SELECT public.next_document_number($1, $2) as num`,
        ctx.garage.id,
        type
      );
      docNumber = result[0]?.num ?? '';
    } catch (rawErr) {
      console.warn('[documents/create] next_document_number failed, falling back to manual numbering:', rawErr);
    }
    if (!docNumber) {
      // Fallback when SQL helper is missing/test environment
      const now = new Date();
      const prefix = type === 'invoice' ? 'FA' : type === 'quote' ? 'DE' : 'OR';
      docNumber = `${prefix}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getTime()).slice(-4)}`;
    }

    // 1. Calculate line prices and sum totals
    let subtotal_ht = 0;
    let total_vat = 0;
    let total_ttc = 0;

    const formattedLines = lines.map((line, index: number) => {
      const qty = Number(line.quantity);
      const price = Number(line.unit_price);
      const disc = Number(line.discount_percent);
      const vat = Number(line.vat_rate);

      const priceAfterDiscount = price * (1 - disc / 100);
      const lineHT = qty * priceAfterDiscount;
      const lineVAT = lineHT * (vat / 100);
      const lineTTC = lineHT + lineVAT;

      subtotal_ht += lineHT;
      total_vat += lineVAT;
      total_ttc += lineTTC;

      return {
        garage_id: ctx.garage.id,
        item_id: line.item_id || null,
        line_type: line.line_type,
        description: line.description,
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

    // 2. Create the document
    const document = await prisma.documents.create({
      data: {
        garage_id: ctx.garage.id,
        type: type as document_type,
        number: docNumber,
        status: (type === 'invoice' ? 'sent' : 'draft') as document_status,
        client_id,
        vehicle_id: vehicle_id || null,
        notes,
        subtotal_ht,
        total_vat,
        total_ttc,
        document_lines: {
          create: formattedLines,
        },
      },
      include: {
        document_lines: true,
      },
    });

    // 3. If the document is an invoice, record stock movements to decrement inventory
    if (type === 'invoice') {
      for (const line of document.document_lines) {
        if (line.item_id && line.line_type === 'part') {
          await prisma.stock_movements.create({
            data: {
              garage_id: ctx.garage.id,
              item_id: line.item_id,
              movement_type: 'sale_out',
              quantity: Number(line.quantity),
              document_id: document.id,
              notes: `Vente Facture N° ${document.number}`,
            },
          });
        }
      }
    }

    return NextResponse.json(document);
  } catch (err: unknown) {
    console.error('Error creating document:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
