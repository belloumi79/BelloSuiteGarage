import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const garage = await prisma.garages.findFirst();
  if (!garage) { console.log('No garage'); return; }
  const gid = garage.id;

  await prisma.stock_movements.deleteMany({ where: { garage_id: gid } });
  await prisma.document_lines.deleteMany({ where: { documents: { garage_id: gid } } });
  await prisma.documents.deleteMany({ where: { garage_id: gid } });
  await prisma.payments.deleteMany({ where: { garage_id: gid } });
  await prisma.items.deleteMany({ where: { garage_id: gid } });
  await prisma.agenda_events.deleteMany({ where: { garage_id: gid } });
  await prisma.vehicles.deleteMany({ where: { garage_id: gid } });
  await prisma.clients.deleteMany({ where: { garage_id: gid } });

  const c = [];
  for (const data of [
    { garage_id: gid, type: 'individual', first_name: 'Ahmed', last_name: 'Ben Salem', email: 'ahmed@test.com', phone: '+216 50 123 456', city: 'Tunis', country: 'TN' },
    { garage_id: gid, type: 'professional', company_name: 'Tunisie Auto SARL', email: 'contact@ta.tn', phone: '+216 71 234 567', city: 'Tunis', country: 'TN', tax_id: '1234567X' },
    { garage_id: gid, type: 'individual', first_name: 'Sarra', last_name: 'Mejri', email: 'sarra@test.com', phone: '+216 52 345 678', city: 'Sfax', country: 'TN' },
    { garage_id: gid, type: 'individual', first_name: 'Mohamed Ali', last_name: 'Trabelsi', email: 'ma@test.com', phone: '+216 98 765 432', city: 'Sousse', country: 'TN' },
    { garage_id: gid, type: 'professional', company_name: 'Location Cars Express', email: 'loc@express.tn', phone: '+216 70 111 222', city: 'Ben Arous', country: 'TN', tax_id: '9876543Y' },
  ]) c.push(await prisma.clients.create({ data }));
  console.log('OK: 5 clients');

  const v = [];
  for (const data of [
    { garage_id: gid, client_id: c[0].id, make: 'Renault', model: 'Clio 4', year: 2019, plate: '123 TU 1542', mileage: 85000 },
    { garage_id: gid, client_id: c[0].id, make: 'Peugeot', model: '308', year: 2021, plate: '456 TN 1023', mileage: 42000 },
    { garage_id: gid, client_id: c[1].id, make: 'VW', model: 'Golf 8', year: 2022, plate: '789 TU 3321', mileage: 28000 },
    { garage_id: gid, client_id: c[2].id, make: 'Toyota', model: 'Yaris', year: 2020, plate: '321 SF 5566', mileage: 61000 },
    { garage_id: gid, client_id: c[3].id, make: 'BMW', model: 'Serie 3', year: 2023, plate: '555 TU 7788', mileage: 15000 },
    { garage_id: gid, client_id: c[4].id, make: 'Dacia', model: 'Duster', year: 2021, plate: '111 TU 9900', mileage: 55000 },
  ]) v.push(await prisma.vehicles.create({ data }));
  console.log('OK: 6 vehicules');

  const i = [];
  for (const data of [
    { garage_id: gid, name: 'Vidange moteur (huile 5W30)', type: 'service', unit: 'forfait', selling_price: 120, vat_rate: 19 },
    { garage_id: gid, name: 'Filtre a huile', type: 'product', unit: 'piece', selling_price: 25, vat_rate: 19, stock_qty: 15, stock_min: 5 },
    { garage_id: gid, name: 'Revision 60000 km', type: 'service', unit: 'forfait', selling_price: 350, vat_rate: 19 },
    { garage_id: gid, name: 'Plaquettes frein AV', type: 'product', unit: 'jeu', selling_price: 85, vat_rate: 19, stock_qty: 8, stock_min: 3 },
    { garage_id: gid, name: 'Disques frein AV', type: 'product', unit: 'paire', selling_price: 140, vat_rate: 19, stock_qty: 6, stock_min: 2 },
    { garage_id: gid, name: 'Changement pneus + equilibrage', type: 'service', unit: 'forfait', selling_price: 60, vat_rate: 19 },
    { garage_id: gid, name: 'Pneu 205/55 R16', type: 'product', unit: 'piece', selling_price: 180, vat_rate: 19, stock_qty: 12, stock_min: 4 },
    { garage_id: gid, name: 'Diagnostic moteur (valise)', type: 'service', unit: 'forfait', selling_price: 75, vat_rate: 19 },
    { garage_id: gid, name: 'Kit courroie distribution', type: 'product', unit: 'kit', selling_price: 220, vat_rate: 19, stock_qty: 4, stock_min: 2 },
    { garage_id: gid, name: 'Remplacement courroie distribution', type: 'service', unit: 'forfait', selling_price: 250, vat_rate: 19 },
    { garage_id: gid, name: 'Recharge climatisation gaz', type: 'service', unit: 'forfait', selling_price: 100, vat_rate: 19 },
    { garage_id: gid, name: 'Batterie 60Ah', type: 'product', unit: 'piece', selling_price: 150, vat_rate: 19, stock_qty: 7, stock_min: 3 },
    { garage_id: gid, name: 'Nettoyage injecteurs', type: 'service', unit: 'forfait', selling_price: 130, vat_rate: 19 },
  ]) i.push(await prisma.items.create({ data }));
  console.log('OK: 13 articles');

  const docConfigs = [
    { c: c[0], v: v[0], type: 'invoice', lines: [{ item: i[0], q: 1, p: 120 }, { item: i[1], q: 1, p: 25 }, { item: i[2], q: 1, p: 350 }], note: 'Reparation suite diagnostic' },
    { c: c[1], v: v[2], type: 'invoice', lines: [{ item: i[3], q: 1, p: 85 }, { item: i[4], q: 1, p: 140 }, { item: i[11], q: 1, p: 150 }], note: 'Remplacement freins + batterie' },
    { c: c[2], v: v[3], type: 'quote', lines: [{ item: i[6], q: 4, p: 180 }, { item: i[5], q: 1, p: 60 }, { item: i[10], q: 1, p: 100 }], note: 'Devis pneumatiques + clim' },
    { c: c[3], v: v[4], type: 'invoice', lines: [{ item: i[8], q: 1, p: 220 }, { item: i[9], q: 1, p: 250 }, { item: i[0], q: 1, p: 120 }], note: 'Remplacement courroie distribution + vidange' },
    { c: c[4], v: v[5], type: 'invoice', lines: [{ item: i[1], q: 1, p: 25 }, { item: i[12], q: 1, p: 130 }, { item: i[7], q: 1, p: 75 }], note: 'Nettoyage injecteurs + diagnostic' },
    { c: c[0], v: v[1], type: 'quote', lines: [{ item: i[3], q: 1, p: 85 }, { item: i[6], q: 2, p: 180 }, { item: i[5], q: 1, p: 60 }], note: 'Devis freinage + pneumatiques' },
  ];

  let docNum = 0;
  for (const d of docConfigs) {
    docNum++;
    const total = d.lines.reduce((s, l) => s + l.q * l.p, 0);
    const vat = total * 0.19;
    const ttc = total + vat;
    const prefix = d.type === 'invoice' ? 'FA' : 'DE';
    await prisma.documents.create({
      data: {
        garage_id: gid, client_id: d.c.id, vehicle_id: d.v.id,
        type: d.type, number: `${prefix}-${String(docNum).padStart(4, '0')}`,
        status: 'draft',
        issue_date: new Date(), due_date: new Date(Date.now() + 30 * 86400000),
        subtotal_ht: total, total_vat: vat, total_ttc: ttc,
        notes: d.note, created_by: '0bdd220d-bacd-4808-a28d-12643475748c',
        document_lines: {
          create: d.lines.map(l => ({
            garage_id: gid, item_id: l.item.id,
            description: l.item.name, quantity: l.q, unit_price: l.p,
            vat_rate: 19, total_ht: l.q * l.p,
          }))
        },
      },
    });
  }
  console.log('OK: 6 documents');

  await prisma.garages.update({ where: { id: gid }, data: { next_invoice_number: 10, next_quote_number: 10 } });

  for (const data of [
    { garage_id: gid, title: 'Vidange + revision', client_id: c[0].id, vehicle_id: v[0].id, starts_at: new Date(Date.now() + 86400000), ends_at: new Date(Date.now() + 86400000 + 7200000), status: 'scheduled', color: '#3b82f6' },
    { garage_id: gid, title: 'Diagnostic moteur BMW', client_id: c[3].id, vehicle_id: v[4].id, starts_at: new Date(Date.now() + 2 * 86400000), ends_at: new Date(Date.now() + 2 * 86400000 + 3600000), status: 'scheduled', color: '#ef4444' },
    { garage_id: gid, title: 'Changement pneus Duster', client_id: c[4].id, vehicle_id: v[5].id, starts_at: new Date(Date.now() + 3 * 86400000), ends_at: new Date(Date.now() + 3 * 86400000 + 5400000), status: 'scheduled', color: '#22c55e' },
  ]) await prisma.agenda_events.create({ data });
  console.log('OK: 3 events');

  console.log('\nDONNEES DE TEST CREES');
}
await main();
await prisma.$disconnect();
