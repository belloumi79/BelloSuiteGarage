 
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const type = searchParams.get('type');
    const next = searchParams.get('next') || '/';

    if (code) {
        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Check if this is a new user who needs garage setup
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const { prisma } = await import('@/lib/prisma');

                // Check if user already has a garage
                const existingMember = await prisma.garage_members.findFirst({
                    where: { user_id: user.id },
                });

                if (!existingMember) {
                    const trialEnd = new Date();
                    trialEnd.setDate(trialEnd.getDate() + 60);

                    // Create garage for new user
                    const garage = await prisma.garages.create({
                        data: {
                            name: user.user_metadata?.full_name ? `${user.user_metadata.full_name}'s Garage` : 'Mon Garage',
                            email: user.email || '',
                            phone: '',
                            address_line1: '',
                            city: 'Tunis',
                            country: 'TN',
                            currency: 'TND',
                            vat_default: 19.0,
                            invoice_prefix: 'FA',
                            quote_prefix: 'DE',
                            order_prefix: 'OR',
                            next_invoice_number: 1,
                            next_quote_number: 1,
                            next_order_number: 1,
                            subscription_plan: 'monthly',
                            subscription_status: 'trial',
                            trial_started_at: new Date(),
                            trial_end_date: trialEnd,
                        },
                    });

                    await prisma.garage_members.create({
                        data: {
                            garage_id: garage.id,
                            user_id: user.id,
                            role: 'owner',
                            active: true,
                            joined_at: new Date(),
                        },
                    });

                    await prisma.profiles.create({
                        data: {
                            id: user.id,
                            full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
                        },
                    });
                }
            }

            return NextResponse.redirect(new URL(next, request.url));
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(new URL('/auth/auth-code-error', request.url));
}