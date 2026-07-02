import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// Plain Helvetica (no external font dependency — keeps the route self-contained)
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1f2937' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  garageBlock: { width: '55%' },
  docBlock: { width: '40%', alignItems: 'flex-end' },
  garageName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#111827' },
  garageInfo: { fontSize: 9, color: '#6b7280', marginTop: 4, lineHeight: 1.5 },
  docTypeLabel: { fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 },
  docNumber: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#2563eb', marginTop: 4 },
  docDate: { fontSize: 9, color: '#6b7280', marginTop: 4 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginVertical: 16 },
  partiesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  partyBox: { width: '48%' },
  partyLabel: { fontSize: 8, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 },
  partyName: { fontFamily: 'Helvetica-Bold', fontSize: 11, marginBottom: 4 },
  partyText: { fontSize: 9, color: '#4b5563', lineHeight: 1.5 },
  vehicleBox: { backgroundColor: '#f9fafb', padding: 10, borderRadius: 4, marginBottom: 16 },
  vehicleRow: { flexDirection: 'row', justifyContent: 'space-between', fontSize: 9 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  colDesc: { width: '42%', paddingRight: 6 },
  colQty: { width: '10%', textAlign: 'right' },
  colPrice: { width: '14%', textAlign: 'right' },
  colDisc: { width: '8%', textAlign: 'right' },
  colVat: { width: '8%', textAlign: 'right' },
  colTotal: { width: '18%', textAlign: 'right' },
  totalsBox: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  totalsCol: { width: '40%' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, fontSize: 10 },
  totalGrand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: '#2563eb',
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
  },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40 },
  footerText: { fontSize: 8, color: '#9ca3af', textAlign: 'center', marginTop: 8 },
  notes: { fontSize: 9, color: '#4b5563', marginTop: 16, lineHeight: 1.5 },
  statusPaid: { color: '#059669', fontFamily: 'Helvetica-Bold' },
});

type DocumentData = {
  garage: {
    name: string;
    legal_name?: string | null;
    address_line1?: string | null;
    address_line2?: string | null;
    postal_code?: string | null;
    city?: string | null;
    phone?: string | null;
    email?: string | null;
    tax_id?: string | null;
    currency?: string | null;
    invoice_footer?: string | null;
  };
  document: {
    type: string;
    number: string;
    status: string;
    issue_date?: Date | string | null;
    due_date?: Date | string | null;
    notes?: string | null;
    amount_paid?: number;
  };
  client: {
    civility?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
    address_line1?: string | null;
    postal_code?: string | null;
    city?: string | null;
    tax_id?: string | null;
  };
  vehicle?: {
    plate?: string | null;
    make?: string | null;
    model?: string | null;
    mileage?: number | null;
  } | null;
  lines: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    discount_percent: number;
    vat_rate: number;
    total_ht: number;
    total_ttc: number;
  }>;
  subtotal_ht: number;
  total_vat: number;
  total_ttc: number;
};

const TYPE_LABELS: Record<string, string> = {
  quote: 'Devis',
  repair_order: 'Ordre de Réparation',
  invoice: 'Facture',
  credit_note: 'Avoir',
};

function formatDate(d?: Date | string | null): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtMoney(n: number, currency: string): string {
  return `${n.toFixed(3)} ${currency || 'TND'}`;
}

export function DocumentPDF({ data }: { data: DocumentData }) {
  const { garage, document: doc, client, vehicle, lines } = data;
  const currency = garage.currency || 'TND';
  const clientName = client.company_name || [client.civility, client.first_name, client.last_name].filter(Boolean).join(' ');
  const isPaid = doc.status === 'paid' && (doc.amount_paid || 0) >= data.total_ttc - 0.001;

  return (
    <Document title={`${TYPE_LABELS[doc.type] || 'Document'} ${doc.number}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.garageBlock}>
            <Text style={styles.garageName}>{garage.name}</Text>
            <Text style={styles.garageInfo}>
              {garage.address_line1}
              {'\n'}
              {[garage.postal_code, garage.city].filter(Boolean).join(' ')}
              {garage.phone ? `\nTél: ${garage.phone}` : ''}
              {garage.email ? `\n${garage.email}` : ''}
              {garage.tax_id ? `\nMF: ${garage.tax_id}` : ''}
            </Text>
          </View>
          <View style={styles.docBlock}>
            <Text style={styles.docTypeLabel}>{TYPE_LABELS[doc.type] || doc.type}</Text>
            <Text style={styles.docNumber}>{doc.number}</Text>
            <Text style={styles.docDate}>Date: {formatDate(doc.issue_date)}</Text>
            {doc.due_date && <Text style={styles.docDate}>Échéance: {formatDate(doc.due_date)}</Text>}
            {isPaid && <Text style={[styles.docDate, styles.statusPaid]}>PAYÉE</Text>}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Parties */}
        <View style={styles.partiesRow}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Client</Text>
            <Text style={styles.partyName}>{clientName}</Text>
            <Text style={styles.partyText}>
              {client.address_line1}
              {client.postal_code || client.city ? `\n${[client.postal_code, client.city].filter(Boolean).join(' ')}` : ''}
              {client.tax_id ? `\nMF: ${client.tax_id}` : ''}
            </Text>
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Garage</Text>
            <Text style={styles.partyName}>{garage.legal_name || garage.name}</Text>
          </View>
        </View>

        {/* Vehicle */}
        {vehicle && (
          <View style={styles.vehicleBox}>
            <View style={styles.vehicleRow}>
              <Text>Véhicule: {[vehicle.make, vehicle.model].filter(Boolean).join(' ')}</Text>
              <Text>Immat: {vehicle.plate}</Text>
            </View>
            {vehicle.mileage != null && (
              <View style={styles.vehicleRow}>
                <Text>Kilométrage: {vehicle.mileage} km</Text>
                <Text></Text>
              </View>
            )}
          </View>
        )}

        {/* Lines table */}
        <View style={styles.tableHeader}>
          <Text style={styles.colDesc}>Désignation</Text>
          <Text style={styles.colQty}>Qté</Text>
          <Text style={styles.colPrice}>Prix Unit.</Text>
          <Text style={styles.colDisc}>Rem.%</Text>
          <Text style={styles.colVat}>TVA%</Text>
          <Text style={styles.colTotal}>Total HT</Text>
        </View>
        {lines.map((line, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.colDesc}>{line.description}</Text>
            <Text style={styles.colQty}>{line.quantity}</Text>
            <Text style={styles.colPrice}>{line.unit_price.toFixed(3)}</Text>
            <Text style={styles.colDisc}>{line.discount_percent || 0}</Text>
            <Text style={styles.colVat}>{line.vat_rate}</Text>
            <Text style={styles.colTotal}>{line.total_ht.toFixed(3)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsBox}>
          <View style={styles.totalsCol}>
            <View style={styles.totalRow}>
              <Text>Total HT</Text>
              <Text>{fmtMoney(data.subtotal_ht, currency)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>TVA</Text>
              <Text>{fmtMoney(data.total_vat, currency)}</Text>
            </View>
            <View style={styles.totalGrand}>
              <Text>Total TTC</Text>
              <Text>{fmtMoney(data.total_ttc, currency)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {doc.notes && (
          <View style={styles.notes}>
            <Text>Notes: {doc.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          {garage.invoice_footer && <Text style={styles.footerText}>{garage.invoice_footer}</Text>}
        </View>
      </Page>
    </Document>
  );
}
