export interface Client {
  id: string;
  garage_id: string;
  type: 'individual' | 'company';
  civility: string | null;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  tax_id: string | null;
  notes: string | null;
  payment_terms_days: number | null;
  discount_percent: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  garage_id: string;
  client_id: string;
  plate: string | null;
  vin: string | null;
  make: string | null;
  model: string | null;
  version: string | null;
  year: number | null;
  engine: string | null;
  transmission: string | null;
  fuel: string | null;
  color: string | null;
  mileage: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  clients?: { first_name: string | null; last_name: string | null; company_name: string | null };
}

export interface Item {
  id: string;
  garage_id: string;
  category_id: string | null;
  supplier_id: string | null;
  type: 'part' | 'labor' | 'service';
  reference: string | null;
  barcode: string | null;
  name: string;
  description: string | null;
  unit: string | null;
  purchase_price: number;
  selling_price: number;
  vat_rate: number;
  stock_qty: number;
  stock_min: number;
  stock_location: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentLine {
  id?: string;
  item_id: string | null;
  line_type: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  vat_rate: number;
  total_ht: number;
  total_vat: number;
  total_ttc: number;
  position?: number;
}

export interface Document {
  id: string;
  garage_id: string;
  type: string;
  number: string;
  status: string;
  client_id: string;
  vehicle_id: string | null;
  issue_date: string;
  due_date: string | null;
  notes: string | null;
  subtotal_ht: number;
  total_vat: number;
  total_ttc: number;
  amount_paid: number;
  created_at: string;
  updated_at: string;
  clients?: { first_name: string | null; last_name: string | null; company_name: string | null; address_line1?: string; address_line2?: string; postal_code?: string; city?: string; phone?: string; tax_id?: string };
  vehicles?: { plate: string | null; make: string | null; model: string | null; version?: string; fuel?: string; color?: string };
  document_lines?: DocumentLine[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Garage {
  id: string;
  name: string;
  legal_name: string | null;
  tax_id: string | null;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  city: string | null;
  vat_default: number;
  invoice_footer: string | null;
  invoice_prefix: string | null;
  quote_prefix: string | null;
  order_prefix: string | null;
}
