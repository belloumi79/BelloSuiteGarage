import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();
        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=recovery`,
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ message: 'Password reset email sent' });
    } catch (err: unknown) {
        return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
    }
}