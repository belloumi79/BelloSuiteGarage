import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabasePublishableKey, supabaseUrl } from '@/lib/supabase/env';

export function createMiddlewareClient(request: NextRequest) {
    // Create an unmodified response
    let supabaseResponse = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(supabaseUrl(), supabasePublishableKey(), {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) =>
                    request.cookies.set(name, value)
                );
                supabaseResponse = NextResponse.next({
                    request,
                });
                cookiesToSet.forEach(({ name, value, options }) =>
                    supabaseResponse.cookies.set(name, value, options)
                );
            },
        },
    });

    return { supabase, supabaseResponse };
}

export async function middleware(request: NextRequest) {
    const { supabase, supabaseResponse } = createMiddlewareClient(request);

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
