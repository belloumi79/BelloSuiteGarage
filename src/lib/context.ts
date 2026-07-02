import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

/**
 * Resolves the currently authenticated user's active garage.
 *
 * Must be called from a Route Handler or Server Component (places where
 * cookies are available). Returns `null` when:
 *   - The user is not authenticated (no Supabase session)
 *   - The user has no `garage_members` row
 *   - The garage membership is inactive
 *
 * The function intentionally bypasses Postgres RLS because Prisma connects
 * via the service-level DATABASE_URL. Multi-tenant scoping is enforced at
 * the application layer: every handler filters by `ctx.garage.id`.
 */
export async function getCurrentGarage() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const membership = await prisma.garage_members.findFirst({
        where: {
            user_id: user.id,
            active: true,
        },
        include: {
            garages: true,
        },
    });

    if (!membership?.garages) return null;

    return { user, garage: membership.garages };
}
