import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendSMS } from '@/lib/sms';
import { sendWhatsApp } from '@/lib/whatsapp';

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const results = {
      checked: 0,
      remindersCreated: 0,
      remindersSent: 0,
      errors: [] as string[],
    };

    // Get all active garages
    const garages = await prisma.garages.findMany({
      where: { subscription_status: 'active' },
      select: { id: true, name: true },
    });

    for (const garage of garages) {
      try {
        // Find vehicles due for service (based on mileage or time)
        const vehicles = await prisma.vehicles.findMany({
          where: {
            garage_id: garage.id,
            // Vehicle has service tracking enabled
            OR: [
              // Due by mileage
              {
                last_service_mileage: { not: null },
                mileage: { not: null },
                service_interval_km: { not: null },
              },
              // Due by time
              {
                last_service_date: { not: null },
                service_interval_months: { not: null },
              },
            ],
          },
          include: {
            clients: {
              select: { id: true, first_name: true, last_name: true, company_name: true, phone: true, mobile: true },
            },
          },
        });

        for (const vehicle of vehicles) {
          results.checked++;
          
          let isDue = false;
          let dueReason = '';
          
          // Check mileage-based service
          if (vehicle.last_service_mileage && vehicle.mileage && vehicle.service_interval_km) {
            const kmSinceService = vehicle.mileage - vehicle.last_service_mileage;
            if (kmSinceService >= vehicle.service_interval_km * 0.9) { // 90% threshold
              isDue = true;
              dueReason = `kilométrage (${kmSinceService} km depuis dernière révision)`;
            }
          }
          
          // Check time-based service
          if (!isDue && vehicle.last_service_date && vehicle.service_interval_months) {
            const monthsSinceService = (now.getTime() - new Date(vehicle.last_service_date).getTime()) / (1000 * 60 * 60 * 24 * 30);
            if (monthsSinceService >= vehicle.service_interval_months * 0.9) { // 90% threshold
              isDue = true;
              dueReason = `délai (${Math.round(monthsSinceService)} mois depuis dernière révision)`;
            }
          }
          
          if (!isDue) continue;

          // Check if reminder already exists for this vehicle (pending or sent recently)
          const existingReminder = await prisma.maintenance_reminders.findFirst({
            where: {
              garage_id: garage.id,
              vehicle_id: vehicle.id,
              type: 'service',
              status: { in: ['pending', 'sent', 'delivered'] },
              scheduled_for: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
            },
          });

          if (existingReminder) continue;

          // Get client contact info
          const client = vehicle.clients;
          const clientName = client.company_name || `${client.first_name || ''} ${client.last_name || ''}`.trim();
          const phone = client.mobile || client.phone;
          const vehicleLabel = vehicle.plate ? `${vehicle.make} ${vehicle.model} (${vehicle.plate})` : `${vehicle.make} ${vehicle.model}`;

          // Create reminder record
          const scheduledFor = new Date(now.getTime() + 2 * 60 * 60 * 1000); // Send in 2 hours (business hours)
          
          const reminder = await prisma.maintenance_reminders.create({
            data: {
              garage_id: garage.id,
              vehicle_id: vehicle.id,
              client_id: vehicle.client_id,
              type: 'service',
              channel: 'sms',
              scheduled_for: scheduledFor,
              message: `Bonjour ${clientName}, votre ${vehicleLabel} approche de sa révision (${dueReason}). Pensez à prendre RDV chez ${garage.name}.`,
              status: 'pending',
            },
          });

          results.remindersCreated++;

          // Try to send immediately if within business hours (8h-19h Tunisia)
          const hour = now.getHours();
          if (hour >= 8 && hour <= 19 && phone) {
            try {
              const message = `Bonjour ${clientName}, votre ${vehicleLabel} approche de sa révision (${dueReason}). Pensez à prendre RDV chez ${garage.name}.`;
              
              // Try WhatsApp first (cheaper), fallback to SMS
              let sent = false;
              if (process.env.WHATSAPP_ENABLED === 'true') {
                sent = await sendWhatsApp(phone, message);
              }
              if (!sent && process.env.SMS_ENABLED === 'true') {
                sent = await sendSMS(phone, message);
              }
              
              if (sent) {
                await prisma.maintenance_reminders.update({
                  where: { id: reminder.id },
                  data: { status: 'sent', sent_at: now, channel: process.env.WHATSAPP_ENABLED === 'true' ? 'whatsapp' : 'sms' },
                });
                results.remindersSent++;
              }
            } catch (err) {
              results.errors.push(`Failed to send reminder for vehicle ${vehicle.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
          }
        }
      } catch (err) {
        results.errors.push(`Garage ${garage.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json(results);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
  }
}