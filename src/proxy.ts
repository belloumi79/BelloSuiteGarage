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
                cookiesToSet.forEach(({ name, value }) =>
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

        // getSession() validates the local session and, when the access token
        // is expired but a refresh token is present, transparently refreshes it
        // and writes the new cookies via setAll. This keeps the session alive
        // for the downstream Route Handlers (which re-validate with getUser()).
        // Previously the proxy used getUser() and returned 401 on its own, which
        // (a) doubled Supabase Auth calls per request (race/rate-limit flakiness)
        // and (b) never refreshed an expired access token.
        const {
            data: { session },
        } = await supabase.auth.getSession();

        console.error(
            `[proxy] path=${request.nextUrl.pathname} session=${session ? session.user.id : 'NONE'}`
        );

        // Auth enforcement is owned by each Route Handler via getCurrentGarage().
        // The proxy only refreshes the session and lets the request through, so a
        // transient auth-server hiccup can never produce a spurious 401 here.
        return supabaseResponse;
    } catch (err) {
        // If Supabase is not configured or unreachable, let the request through
        // so the route/layout can handle it gracefully instead of 500-ing.
        console.error('[proxy] error:', err);
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
