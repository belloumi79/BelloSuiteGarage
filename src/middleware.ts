import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabasePublishableKey, supabaseUrl } from '@/lib/supabase/env';

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        supabaseUrl(),
        supabasePublishableKey(),
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({ name, value, ...options });
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    supabaseResponse.cookies.set({ name, value, ...options });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options });
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    supabaseResponse.cookies.set({ name, value: '', ...options });
                },
            },
        }
    );

    // Refresh session if expired - required for Server Components
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Protected routes that require authentication
    const protectedPaths = ['/api/clients', '/api/vehicles', '/api/documents', '/api/items', '/api/payments', '/api/agenda', '/api/dashboard'];
    const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path));

    // Auth routes that should redirect to dashboard if already logged in
    const authPaths = ['/login', '/signup', '/auth'];
    const isAuthPath = authPaths.some(path => request.nextUrl.pathname.startsWith(path));

    if (isProtectedPath && !user) {
        // Redirect to login for API routes
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isAuthPath && user) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};