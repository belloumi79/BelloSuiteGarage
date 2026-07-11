import { z } from 'zod';

/**
 * Client validation schemas
 */
const clientBaseSchema = z.object({
    type: z.enum(['individual', 'company']).default('individual'),
    civility: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    company_name: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    address_line1: z.string().optional(),
    address_line2: z.string().optional(),
    postal_code: z.string().optional(),
    city: z.string().optional(),
    country: z.string().default('TN'),
    tax_id: z.string().optional(),
    notes: z.string().optional(),
    payment_terms_days: z.number().int().min(0).default(0),
    discount_percent: z.number().min(0).max(100).default(0),
});

export const clientCreateSchema = clientBaseSchema.refine(
    (data) => {
        if (data.type === 'company') {
            return !!data.company_name;
        }
        return !!data.first_name && !!data.last_name;
    },
    {
        message: 'Company name is required for company type, first_name and last_name required for individual type',
        path: ['type'],
    }
);

export const clientUpdateSchema = clientBaseSchema.partial();

/**
 * Vehicle validation schemas
 */
export const vehicleCreateSchema = z.object({
    client_id: z.string().uuid(),
    plate: z.string().optional(),
    vin: z.string().optional(),
    make: z.string().optional(),
    model: z.string().optional(),
    version: z.string().optional(),
    year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
    engine: z.string().optional(),
    transmission: z.string().optional(),
    fuel: z.string().optional(),
    color: z.string().optional(),
    mileage: z.number().int().min(0).optional(),
    notes: z.string().optional(),
});

export const vehicleUpdateSchema = vehicleCreateSchema.partial();

/**
 * Item validation schemas
 */
export const itemCreateSchema = z.object({
    category_id: z.string().uuid().optional(),
    supplier_id: z.string().uuid().optional(),
    type: z.enum(['part', 'labor', 'service']).default('part'),
    reference: z.string().optional(),
    barcode: z.string().optional(),
    name: z.string().min(1),
    description: z.string().optional(),
    unit: z.string().default('pcs'),
    purchase_price: z.number().min(0).default(0),
    selling_price: z.number().min(0).default(0),
    vat_rate: z.number().min(0).max(100).default(19),
    stock_qty: z.number().min(0).default(0),
    stock_min: z.number().min(0).default(0),
    stock_location: z.string().optional(),
});

export const itemUpdateSchema = itemCreateSchema.partial();

/**
 * Document validation schemas
 */
function coerceToNumber(val: unknown) {
    if (val === null || val === undefined) return undefined;
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
}

const lineTypeSchema = z.enum(['part', 'labor', 'service', 'note']);

export const documentLineSchema = z.object({
    item_id: z.preprocess((val) => val === '' ? undefined : val, z.string().uuid().optional()),
    line_type: z.union([lineTypeSchema, z.literal('')]).transform((val) => val === '' ? 'part' : val),
    description: z.string().min(1),
    quantity: z.preprocess(coerceToNumber, z.number().min(0.001)),
    unit: z.string().default('pcs'),
    unit_price: z.preprocess(coerceToNumber, z.number().min(0)),
    discount_percent: z.preprocess(coerceToNumber, z.number().min(0).max(100).default(0)),
    vat_rate: z.preprocess(coerceToNumber, z.number().min(0).max(100).default(19)),
    // Accept client-provided totals (ignored server-side; recalculated in handler)
    total_ht: z.preprocess(coerceToNumber, z.number().min(0).optional()),
    total_vat: z.preprocess(coerceToNumber, z.number().min(0).optional()),
    total_ttc: z.preprocess(coerceToNumber, z.number().min(0).optional()),
});

export const documentCreateSchema = z.object({
    type: z.enum(['quote', 'repair_order', 'invoice', 'credit_note']),
    client_id: z.string().uuid(),
    vehicle_id: z.preprocess((val) => val === '' ? undefined : val, z.string().uuid().optional()),
    notes: z.string().optional(),
    lines: z.array(documentLineSchema).min(1, 'At least one line is required'),
});

export const documentUpdateSchema = z.object({
    status: z.enum(['draft', 'sent', 'partial', 'paid', 'cancelled']).optional(),
    notes: z.string().optional(),
    lines: z.array(documentLineSchema).optional(),
    transitionTo: z.enum(['repair_order', 'invoice']).optional(),
    vehicle_id: z.preprocess((val) => val === '' ? undefined : val, z.string().uuid().optional()),
});

/**
 * Payment validation schemas
 */
export const paymentCreateSchema = z.object({
    document_id: z.string().uuid(),
    amount: z.number().positive(),
    method: z.enum(['cash', 'card', 'check', 'transfer', 'other']).default('cash'),
    reference: z.string().optional(),
    notes: z.string().optional(),
});

/**
 * Agenda validation schemas
 */
export const agendaCreateSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    starts_at: z.string().datetime(),
    ends_at: z.string().datetime(),
    client_id: z.string().uuid().optional(),
    vehicle_id: z.string().uuid().optional(),
    status: z.enum(['planned', 'in_progress', 'completed', 'cancelled']).default('planned'),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3b82f6'),
});

export const agendaUpdateSchema = agendaCreateSchema.partial();

/**
 * Stock movement validation schemas
 */
export const stockMovementCreateSchema = z.object({
    item_id: z.string().uuid(),
    movement_type: z.enum([
        'purchase_in',
        'sale_out',
        'return_in',
        'return_out',
        'internal_use',
        'adjustment',
    ]),
    quantity: z.number().positive(),
    unit_cost: z.number().min(0).default(0),
    reference: z.string().optional(),
    notes: z.string().optional(),
});

/**
 * Garage validation schemas
 */
export const garageCreateSchema = z.object({
    name: z.string().min(1),
    legal_name: z.string().optional(),
    tax_id: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    website: z.string().url().optional().or(z.literal('')),
    address_line1: z.string().optional(),
    address_line2: z.string().optional(),
    postal_code: z.string().optional(),
    city: z.string().optional(),
    country: z.string().default('TN'),
    currency: z.string().default('TND'),
    vat_default: z.number().min(0).max(100).default(19),
    invoice_prefix: z.string().default('FA'),
    quote_prefix: z.string().default('DE'),
    order_prefix: z.string().default('OR'),
    next_invoice_number: z.number().int().positive().default(1),
    next_quote_number: z.number().int().positive().default(1),
    next_order_number: z.number().int().positive().default(1),
    invoice_footer: z.string().optional(),
});

export const garageUpdateSchema = garageCreateSchema.partial();