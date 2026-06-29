import { prisma } from './prisma';

export async function checkAndSeed() {
  // Check if a garage exists
  const garageCount = await prisma.garages.count();
  if (garageCount > 0) {
    // Already seeded or has data
    const garage = await prisma.garages.findFirst();
    return garage;
  }

  console.log('No garages found. Seeding default data...');

  // 1. Create a default garage
  const garage = await prisma.garages.create({
    data: {
      name: 'Garage Bello Tunis',
      legal_name: 'BelloSuite Garage S.A.R.L.',
      tax_id: '1234567/A/M/000',
      phone: '+216 71 000 000',
      email: 'contact@bellogarage.com',
      website: 'www.bellogarage.tn',
      address_line1: 'Avenue de la République',
      city: 'Tunis',
      postal_code: '1000',
      country: 'TN',
      currency: 'TND',
      vat_default: 19.0,
      invoice_prefix: 'FA',
      quote_prefix: 'DE',
      order_prefix: 'OR',
      next_invoice_number: 101,
      next_quote_number: 201,
      next_order_number: 301,
    },
  });

  // 2. Create some default categories
  const cat1 = await prisma.item_categories.create({
    data: {
      garage_id: garage.id,
      name: 'Freinage',
    },
  });
  const cat2 = await prisma.item_categories.create({
    data: {
      garage_id: garage.id,
      name: 'Moteur & Filtration',
    },
  });

  // 3. Create default clients
  const client1 = await prisma.clients.create({
    data: {
      garage_id: garage.id,
      type: 'individual',
      civility: 'M.',
      first_name: 'Ahmed',
      last_name: 'Ben Ali',
      email: 'ahmed.benali@gmail.com',
      phone: '+216 98 123 456',
      address_line1: 'Rue de Sousse',
      city: 'Tunis',
      payment_terms_days: 30,
      discount_percent: 5.0,
    },
  });

  const client2 = await prisma.clients.create({
    data: {
      garage_id: garage.id,
      type: 'company',
      company_name: 'BelloCorp Logistics',
      first_name: 'Sarah',
      last_name: 'Kamoun',
      email: 'sk@bellocorp.com',
      phone: '+216 71 888 999',
      address_line1: 'Zone Industrielle',
      city: 'Ariana',
      tax_id: '8765432/B/P/000',
      payment_terms_days: 45,
      discount_percent: 10.0,
    },
  });

  // 4. Create vehicles linked to clients
  const veh1 = await prisma.vehicles.create({
    data: {
      garage_id: garage.id,
      client_id: client1.id,
      plate: '123 TUN 4567',
      make: 'Volkswagen',
      model: 'Golf 8',
      version: '1.4 TSI',
      fuel: 'Essence',
      color: 'Gris Métallisé',
      year: 2021,
      mileage: 45000,
    },
  });

  const veh2 = await prisma.vehicles.create({
    data: {
      garage_id: garage.id,
      client_id: client2.id,
      plate: '987 TUN 6543',
      make: 'Peugeot',
      model: 'Partner',
      version: '1.6 BlueHDi',
      fuel: 'Diesel',
      color: 'Blanc',
      year: 2019,
      mileage: 120000,
    },
  });

  // 5. Create items (parts & labor)
  const item1 = await prisma.items.create({
    data: {
      garage_id: garage.id,
      category_id: cat1.id,
      type: 'part',
      reference: 'PLA-AV-G8',
      barcode: '40138729012',
      name: 'Plaquettes de frein avant Golf 8',
      purchase_price: 65.0,
      selling_price: 110.0,
      vat_rate: 19.0,
      stock_qty: 8,
      stock_min: 2,
      stock_location: 'Rayon B2',
    },
  });

  const item2 = await prisma.items.create({
    data: {
      garage_id: garage.id,
      category_id: cat2.id,
      type: 'part',
      reference: 'FIL-OIL-VW',
      barcode: '40138729055',
      name: 'Filtre à huile Volkswagen 1.4',
      purchase_price: 12.0,
      selling_price: 25.0,
      vat_rate: 19.0,
      stock_qty: 15,
      stock_min: 5,
      stock_location: 'Rayon A1',
    },
  });

  const item3 = await prisma.items.create({
    data: {
      garage_id: garage.id,
      type: 'labor',
      reference: 'MO-MEC-GEN',
      name: 'Main d\'œuvre mécanique générale (Heure)',
      purchase_price: 0.0,
      selling_price: 45.0,
      vat_rate: 19.0,
      stock_qty: 9999,
      stock_min: 0,
    },
  });

  // 6. Create some historical documents
  // Draft Quote (Devis)
  const quote = await prisma.documents.create({
    data: {
      garage_id: garage.id,
      type: 'quote',
      number: 'DE-000201',
      status: 'draft',
      client_id: client1.id,
      vehicle_id: veh1.id,
      issue_date: new Date(),
      subtotal_ht: 155.0,
      total_vat: 29.45,
      total_ttc: 184.45,
      document_lines: {
        create: [
          {
            garage_id: garage.id,
            line_type: 'part',
            item_id: item1.id,
            description: item1.name,
            quantity: 1,
            unit_price: 110.0,
            vat_rate: 19.0,
            total_ht: 110.0,
            total_vat: 20.9,
            total_ttc: 130.9,
          },
          {
            garage_id: garage.id,
            line_type: 'labor',
            item_id: item3.id,
            description: 'Remplacement plaquettes avant',
            quantity: 1.0,
            unit_price: 45.0,
            vat_rate: 19.0,
            total_ht: 45.0,
            total_vat: 8.55,
            total_ttc: 53.55,
          },
        ],
      },
    },
  });

  // Paid Invoice
  const invoice = await prisma.documents.create({
    data: {
      garage_id: garage.id,
      type: 'invoice',
      number: 'FA-000101',
      status: 'paid',
      client_id: client2.id,
      vehicle_id: veh2.id,
      issue_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      due_date: new Date(),
      subtotal_ht: 70.0,
      total_vat: 13.3,
      total_ttc: 83.3,
      amount_paid: 83.3,
      document_lines: {
        create: [
          {
            garage_id: garage.id,
            line_type: 'part',
            item_id: item2.id,
            description: item2.name,
            quantity: 1,
            unit_price: 25.0,
            vat_rate: 19.0,
            total_ht: 25.0,
            total_vat: 4.75,
            total_ttc: 29.75,
          },
          {
            garage_id: garage.id,
            line_type: 'labor',
            item_id: item3.id,
            description: 'Vidange moteur + remplacement filtre',
            quantity: 1.0,
            unit_price: 45.0,
            vat_rate: 19.0,
            total_ht: 45.0,
            total_vat: 8.55,
            total_ttc: 53.55,
          },
        ],
      },
      payments: {
        create: {
          garage_id: garage.id,
          amount: 83.3,
          method: 'card',
        },
      },
    },
  });

  // Create agenda event
  await prisma.agenda_events.create({
    data: {
      garage_id: garage.id,
      title: 'Entretien Golf 8 - Ahmed',
      starts_at: new Date(Date.now() + 2 * 60 * 60 * 1000), // In 2 hours
      ends_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
      client_id: client1.id,
      vehicle_id: veh1.id,
      status: 'planned',
    },
  });

  console.log('Database seeded successfully!');
  return garage;
}
