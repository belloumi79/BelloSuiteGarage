import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const { email, password, fullName, garageName } = await request.json();
        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
                emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
            },
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // If user is created and email confirmation is not required, create garage and profile
        if (data.user && !data.session) {
            // Email confirmation required - user will be created after confirmation
            return NextResponse.json({ user: data.user, message: 'Please check your email to confirm your account' });
        }

        if (data.user && data.session) {
            // Create garage and profile for the new user
            const { prisma } = await import('@/lib/prisma');

            const trialEnd = new Date();
            trialEnd.setDate(trialEnd.getDate() + 60);

            const garage = await prisma.garages.create({
                data: {
                    name: garageName || 'Mon Garage',
                    email: email,
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

            // Create garage member with owner role
            await prisma.garage_members.create({
                data: {
                    garage_id: garage.id,
                    user_id: data.user.id,
                    role: 'owner',
                    active: true,
                    joined_at: new Date(),
                },
            });

            // Create profile
            await prisma.profiles.create({
                data: {
                    id: data.user.id,
                    full_name: fullName,
                },
            });
        }

        return NextResponse.json({ user: data.user, session: data.session });
    } catch (err: unknown) {
        return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
    }
}