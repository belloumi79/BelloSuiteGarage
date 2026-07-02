import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
    try {
        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);
        const { error } = await supabase.auth.signOut();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ message: 'Logged out successfully' });
    } catch (err: unknown) {
        return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
    }
}