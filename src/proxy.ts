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
    try {
        const { supabase, supabaseResponse } = createMiddlewareClient(request);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        // Protected API routes — return 401 JSON for unauthenticated callers
        const protectedApiPaths = ['/api/clients', '/api/vehicles', '/api/documents', '/api/items', '/api/payments', '/api/agenda', '/api/dashboard'];
        const isProtectedApi = protectedApiPaths.some(path => request.nextUrl.pathname.startsWith(path));

        const isRootApp = request.nextUrl.pathname === '/';

        const authPaths = ['/login', '/signup', '/reset-password'];
        const isAuthPath = authPaths.some(path => request.nextUrl.pathname.startsWith(path));

        if (isProtectedApi && !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (isRootApp && !user) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        if (isAuthPath && user) {
            return NextResponse.redirect(new URL('/', request.url));
        }

        return supabaseResponse;
    } catch {
        // If Supabase is not configured or unreachable, let the request through
        // so the page/layout can handle it gracefully instead of causing redirect loops.
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
