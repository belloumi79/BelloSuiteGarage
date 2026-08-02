import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/admin';
import { getErrorMessage } from '@/lib/errors';
import { apiHeaders } from '@/lib/api-headers';

export async function GET() {
  try {
    await requireSuperAdmin();

    const garages = await prisma.garages.findMany({
      include: {
        garage_members: {
          where: { role: 'owner' },
          include: {
            users: { select: { email: true, raw_user_meta_data: true } },
          },
        },
        _count: { select: { garage_members: true, vehicles: true, documents: true, items: true, clients: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const result = garages.map(g => {
      const ownerMeta = g.garage_members[0]?.users.raw_user_meta_data as Record<string, unknown> | null;
      const ownerName = ownerMeta?.full_name || (ownerMeta?.first_name && ownerMeta?.last_name ? `${ownerMeta.first_name} ${ownerMeta.last_name}` : null);
      
      return {
        id: g.id,
        name: g.name,
        email: g.email,
        legal_name: g.legal_name,
        tax_id: g.tax_id,
        phone: g.phone,
        city: g.city,
        address_line1: g.address_line1,
        subscription_plan: g.subscription_plan,
        subscription_status: g.subscription_status,
        trial_end_date: g.trial_end_date,
        activation_code: g.activation_code,
        suspended_at: g.suspended_at,
        created_at: g.created_at,
        updated_at: g.updated_at,
        members_count: g._count.garage_members,
        vehicles_count: g._count.vehicles,
        documents_count: g._count.documents,
        items_count: g._count.items,
        clients_count: g._count.clients,
        owner_email: g.garage_members[0]?.users.email || null,
        owner_name: ownerName,
      };
    });

    return NextResponse.json(result, { headers: apiHeaders() });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status = message === 'Not authenticated' ? 401 : message === 'Forbidden: super admin only' ? 403 : 500;
    return NextResponse.json({ error: message }, { status, headers: apiHeaders() });
  }
}