import type { Prisma, stock_movement_type } from '@prisma/client';

type StockMovementInput = {
  garage_id: string;
  item_id: string;
  movement_type: stock_movement_type;
  quantity: number;
  unit_cost?: number;
  document_id?: string;
  reference?: string;
  notes?: string;
  created_by?: string;
};

type DbClient = Pick<Prisma.TransactionClient, 'stock_movements' | 'items'>;

/** Creates a stock movement and updates items.stock_qty accordingly. */
export async function applyStockMovement(
  tx: DbClient,
  input: StockMovementInput
) {
  const qty = Number(input.quantity);
  const movement = await tx.stock_movements.create({
    data: {
      garage_id: input.garage_id,
      item_id: input.item_id,
      movement_type: input.movement_type,
      quantity: qty,
      unit_cost: input.unit_cost ?? 0,
      document_id: input.document_id ?? null,
      reference: input.reference ?? null,
      notes: input.notes ?? null,
      created_by: input.created_by ?? null,
    },
  });

  const decrement =
    input.movement_type === 'sale_out' ||
    input.movement_type === 'internal_use' ||
    input.movement_type === 'return_out';

  await tx.items.update({
    where: { id: input.item_id },
    data: {
      stock_qty: { increment: decrement ? -qty : qty },
    },
  });

  return movement;
}

type DocumentLineForStock = {
  id: string;
  garage_id: string;
  item_id: string | null;
  line_type: string;
  description: string;
  quantity: Prisma.Decimal | number | null;
  unit: string | null;
  unit_price: Prisma.Decimal | number | null;
  vat_rate: Prisma.Decimal | number | null;
};

type CreatedItemResult = {
  lineId: string;
  itemId: string;
};

/**
 * When a quote is validated (→ repair order), free-text lines without item_id
 * are registered in the catalog and parts are added to stock.
 */
export async function registerFreeTextLinesToStock(
  tx: DbClient,
  lines: DocumentLineForStock[],
  documentId: string,
  documentNumber: string,
  createdBy?: string
): Promise<CreatedItemResult[]> {
  const created: CreatedItemResult[] = [];

  for (const line of lines) {
    if (line.item_id) continue;
    if (line.line_type !== 'part' && line.line_type !== 'labor') continue;

    const qty = Number(line.quantity ?? 1);
    const unitPrice = Number(line.unit_price ?? 0);
    const vatRate = Number(line.vat_rate ?? 19);

    const item = await tx.items.create({
      data: {
        garage_id: line.garage_id,
        type: line.line_type,
        name: line.description,
        unit: line.unit ?? (line.line_type === 'labor' ? 'h' : 'pcs'),
        purchase_price: unitPrice,
        selling_price: unitPrice,
        vat_rate: vatRate,
        stock_qty: line.line_type === 'labor' ? 9999 : 0,
        stock_min: 0,
        reference: `AUTO-${documentNumber}-${line.id.slice(0, 8)}`,
      },
    });

    if (line.line_type === 'part' && qty > 0) {
      await applyStockMovement(tx, {
        garage_id: line.garage_id,
        item_id: item.id,
        movement_type: 'purchase_in',
        quantity: qty,
        unit_cost: unitPrice,
        document_id: documentId,
        notes: `Entrée stock suite validation devis N° ${documentNumber}`,
        created_by: createdBy,
      });
    }

    created.push({ lineId: line.id, itemId: item.id });
  }

  return created;
}
