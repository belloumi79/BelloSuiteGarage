import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentGarage } from '@/lib/context';
import { apiHeaders } from '@/lib/api-headers';

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const vehicle_id = searchParams.get('vehicle_id') || '';
    const type = searchParams.get('type') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)));

    const where: Record<string, unknown> = {
      garage_id: ctx.garage.id,
    };

    if (status) where.status = status;
    if (vehicle_id) where.vehicle_id = vehicle_id;
    if (type) where.type = type;

    const [reminders, total] = await Promise.all([
      prisma.maintenance_reminders.findMany({
        where,
        include: {
          vehicles: {
            select: { plate: true, make: true, model: true, client_id: true },
          },
          clients: {
            select: { first_name: true, last_name: true, company_name: true, phone: true, mobile: true },
          },
        },
        orderBy: { scheduled_for: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.maintenance_reminders.count({ where }),
    ]);

    return NextResponse.json({ data: reminders, total, page, pageSize }, { headers: apiHeaders() });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentGarage();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      vehicle_id,
      type = 'service',
      channel = 'sms',
      scheduled_for,
      message,
    } = body;

    if (!vehicle_id || !scheduled_for) {
      return NextResponse.json(
        { error: 'vehicle_id et scheduled_for sont requis' },
        { status: 400, headers: apiHeaders() }
      );
    }

    // Verify vehicle belongs to garage
    const vehicle = await prisma.vehicles.findFirst({
      where: { id: vehicle_id, garage_id: ctx.garage.id },
      include: { clients: true },
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'Véhicule non trouvé' }, { status: 404, headers: apiHeaders() });
    }

    const reminder = await prisma.maintenance_reminders.create({
      data: {
        garage_id: ctx.garage.id,
        vehicle_id,
        client_id: vehicle.client_id,
        type,
        channel,
        scheduled_for: new Date(scheduled_for),
        message: message || generateReminderMessage(vehicle, type),
        status: 'pending',
      },
      include: {
        vehicles: { select: { plate: true, make: true, model: true } },
        clients: { select: { first_name: true, last_name: true, company_name: true, phone: true, mobile: true } },
      },
    });

    return NextResponse.json(reminder, { headers: apiHeaders() });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

function generateReminderMessage(vehicle: { plate?: string | null; make?: string | null; model?: string | null; clients?: { first_name?: string | null; last_name?: string | null; company_name?: string | null } | null }, type: string): string {
  const clientName = vehicle.clients
    ? vehicle.clients.company_name || `${vehicle.clients.first_name || ''} ${vehicle.clients.last_name || ''}`.trim()
    : 'Client';
  const vehicleLabel = vehicle.plate ? `${vehicle.make} ${vehicle.model} (${vehicle.plate})` : `${vehicle.make} ${vehicle.model}`;

  const templates: Record<string, string> = {
    service: `Bonjour ${clientName}, votre ${vehicleLabel} approche de sa révision. Pensez à prendre RDV chez BelloGarage.`,
    inspection: `Bonjour ${clientName}, le contrôle technique de votre ${vehicleLabel} arrive à échéance. Anticipez votre visite.`,
    insurance: `Bonjour ${clientName}, l'assurance de votre ${vehicleLabel} expire bientôt. Renouvelez à temps.`,
    tire_change: `Bonjour ${clientName}, c'est le moment de changer les pneus de votre ${vehicleLabel}. Prenez RDV.`,
  };

  return templates[type] || templates.service;
}