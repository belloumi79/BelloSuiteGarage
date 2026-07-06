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

export async function proxy(request: NextRequest) {
    try {
        const { supabase, supabaseResponse } = createMiddlewareClient(request);

        // Refresh session if expired — this may call setAll to update cookies.
        // IMPORTANT: we must NOT use NextResponse.redirect() after this point,
        // because setAll's cookies would be lost on the redirect response.
        const {
            data: { user },
        } = await supabase.auth.getUser();

        // Protect API routes — return 401 JSON for unauthenticated callers.
        // This uses a fresh response so cookie loss is irrelevant for 401.
        const protectedApiPaths = ['/api/clients', '/api/vehicles', '/api/documents', '/api/items', '/api/payments', '/api/agenda', '/api/dashboard'];
        const isProtectedApi = protectedApiPaths.some(path => request.nextUrl.pathname.startsWith(path));

        if (isProtectedApi && !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Always return supabaseResponse (which carries any cookies setAll refreshed).
        // Page auth is handled by (app)/layout.tsx via getCurrentGarage().
        // Avoiding explicit page redirects here prevents the cookie-loss redirect loop.
        return supabaseResponse;
    } catch {
        // If Supabase is not configured or unreachable, let the request through
        // so the page/layout can handle it gracefully instead of 500-ing.
        return NextResponse.next();
    }
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
