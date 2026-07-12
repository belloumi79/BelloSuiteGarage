import { prisma } from '../prisma';
import { generateEmbedding } from './embeddings';
import { removeEntityEmbeddings } from './search';
import type { IndexableEntity } from './types';

function buildClientText(client: {
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  city: string | null;
  notes: string | null;
}): string {
  return [
    `Client: ${[client.first_name, client.last_name].filter(Boolean).join(' ')}`,
    client.company_name && `Société: ${client.company_name}`,
    client.email && `Email: ${client.email}`,
    client.phone && `Tél: ${client.phone}`,
    client.mobile && `Mobile: ${client.mobile}`,
    client.city && `Ville: ${client.city}`,
    client.notes && `Notes: ${client.notes}`,
  ].filter(Boolean).join('\n');
}

function buildVehicleText(vehicle: {
  plate: string | null;
  make: string | null;
  model: string | null;
  vin: string | null;
  year: number | null;
  engine: string | null;
  fuel: string | null;
  color: string | null;
  mileage: number | null;
  notes: string | null;
}): string {
  return [
    `Véhicule: ${[vehicle.make, vehicle.model].filter(Boolean).join(' ')}`,
    vehicle.plate && `Immatriculation: ${vehicle.plate}`,
    vehicle.vin && `VIN: ${vehicle.vin}`,
    vehicle.year && `Année: ${vehicle.year}`,
    vehicle.engine && `Moteur: ${vehicle.engine}`,
    vehicle.fuel && `Carburant: ${vehicle.fuel}`,
    vehicle.color && `Couleur: ${vehicle.color}`,
    vehicle.mileage != null && `Kilométrage: ${vehicle.mileage}`,
    vehicle.notes && `Notes: ${vehicle.notes}`,
  ].filter(Boolean).join('\n');
}

function buildDocumentText(doc: {
  type: string;
  number: string;
  status: string;
  object: string | null;
  notes: string | null;
  total_ttc: string | null | number;
  issue_date: Date | string | null;
  client_name?: string | null;
  client_company?: string | null;
  vehicle_plate?: string | null;
}): string {
  const clientInfo = [doc.client_name, doc.client_company].filter(Boolean).join(' - ');
  return [
    `Document ${doc.type.toUpperCase()} N°${doc.number}`,
    doc.status && `Statut: ${doc.status}`,
    doc.object && `Objet: ${doc.object}`,
    clientInfo && `Client: ${clientInfo}`,
    doc.vehicle_plate && `Véhicule: ${doc.vehicle_plate}`,
    doc.issue_date && `Date: ${new Date(doc.issue_date).toLocaleDateString('fr-FR')}`,
    doc.total_ttc != null && `Total TTC: ${doc.total_ttc}`,
    doc.notes && `Notes: ${doc.notes}`,
  ].filter(Boolean).join('\n');
}

function buildItemText(item: {
  name: string;
  reference: string | null;
  barcode: string | null;
  description: string | null;
  stock_qty: string | null | number;
  selling_price: string | null | number;
  category_name?: string | null;
}): string {
  return [
    `Article: ${item.name}`,
    item.reference && `Réf: ${item.reference}`,
    item.barcode && `Code-barres: ${item.barcode}`,
    item.description && `Description: ${item.description}`,
    item.stock_qty != null && `Stock: ${item.stock_qty}`,
    item.selling_price != null && `Prix vente: ${item.selling_price}`,
    item.category_name && `Catégorie: ${item.category_name}`,
  ].filter(Boolean).join('\n');
}

async function indexEntity(entity: IndexableEntity): Promise<void> {
  await removeEntityEmbeddings(entity.type, entity.id);
  const embedding = await generateEmbedding(entity.text);
  await prisma.$executeRawUnsafe(
    `INSERT INTO doc_embeddings (garage_id, entity_type, entity_id, content, embedding, metadata)
     VALUES ($1::uuid, $2, $3, $4, $5::vector(384), $6::jsonb)`,
    entity.garage_id,
    entity.type,
    entity.id,
    entity.text,
    `[${embedding.join(',')}]`,
    JSON.stringify(entity.metadata)
  );
}

export async function indexAll(garageId: string): Promise<{ indexed: number }> {
  let indexed = 0;

  const clients = await prisma.clients.findMany({
    where: { garage_id: garageId },
    select: {
      id: true, garage_id: true, first_name: true, last_name: true,
      company_name: true, email: true, phone: true, mobile: true,
      city: true, notes: true, created_at: true,
    },
  });

  for (const c of clients) {
    await indexEntity({
      type: 'client',
      id: c.id,
      garage_id: c.garage_id,
      text: buildClientText(c),
      metadata: {
        first_name: c.first_name,
        last_name: c.last_name,
        company_name: c.company_name,
        email: c.email,
        phone: c.phone,
        created_at: c.created_at.toISOString(),
      },
    });
    indexed++;
  }

  const vehicles = await prisma.vehicles.findMany({
    where: { garage_id: garageId },
    select: {
      id: true, garage_id: true, client_id: true, plate: true, vin: true,
      make: true, model: true, year: true, engine: true, fuel: true,
      color: true, mileage: true, notes: true, created_at: true,
    },
  });

  for (const v of vehicles) {
    await indexEntity({
      type: 'vehicle',
      id: v.id,
      garage_id: v.garage_id,
      text: buildVehicleText(v),
      metadata: {
        plate: v.plate,
        make: v.make,
        model: v.model,
        vin: v.vin,
        year: v.year,
        fuel: v.fuel,
        mileage: v.mileage,
        client_id: v.client_id,
        created_at: v.created_at.toISOString(),
      },
    });
    indexed++;
  }

  const docs = await prisma.documents.findMany({
    where: { garage_id: garageId },
    include: {
      clients: { select: { company_name: true, first_name: true, last_name: true } },
      vehicles: { select: { plate: true } },
    },
  });

  for (const d of docs) {
    const clientName = d.clients
      ? [d.clients.first_name, d.clients.last_name].filter(Boolean).join(' ')
      : null;
    await indexEntity({
      type: 'document',
      id: d.id,
      garage_id: d.garage_id,
      text: buildDocumentText({
        type: d.type,
        number: d.number,
        status: d.status,
        object: d.object,
        notes: d.notes,
        total_ttc: d.total_ttc?.toString() ?? null,
        issue_date: d.issue_date,
        client_name: clientName,
        client_company: d.clients?.company_name,
        vehicle_plate: d.vehicles?.plate,
      }),
      metadata: {
        type: d.type,
        number: d.number,
        status: d.status,
        client_id: d.client_id,
        vehicle_id: d.vehicle_id,
        total_ttc: d.total_ttc?.toString(),
        issue_date: d.issue_date.toISOString(),
        created_at: d.created_at.toISOString(),
      },
    });
    indexed++;
  }

  const items = await prisma.items.findMany({
    where: { garage_id: garageId },
    include: {
      item_categories: { select: { name: true } },
    },
  });

  for (const i of items) {
    await indexEntity({
      type: 'item',
      id: i.id,
      garage_id: i.garage_id,
      text: buildItemText({
        name: i.name,
        reference: i.reference,
        barcode: i.barcode,
        description: i.description,
        stock_qty: i.stock_qty?.toString() ?? null,
        selling_price: i.selling_price?.toString() ?? null,
        category_name: i.item_categories?.name,
      }),
      metadata: {
        name: i.name,
        reference: i.reference,
        barcode: i.barcode,
        stock_qty: i.stock_qty?.toString(),
        selling_price: i.selling_price?.toString(),
        category: i.item_categories?.name,
        created_at: i.created_at.toISOString(),
      },
    });
    indexed++;
  }

  return { indexed };
}
