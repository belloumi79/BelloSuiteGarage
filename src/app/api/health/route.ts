import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const dbUrlSet = !!process.env.DATABASE_URL;
    const supabaseUrlSet = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKeySet = !!(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    let dbConnected = false;
    let dbError: string | null = null;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbConnected = true;
    } catch (err) {
      dbError = getErrorMessage(err);
    }

    return NextResponse.json({
      status: dbConnected ? 'ok' : 'degraded',
      env: {
        databaseUrlSet: dbUrlSet,
        supabaseUrlSet,
        supabaseKeySet,
      },
      database: {
        connected: dbConnected,
        error: dbError,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: 'error',
        error: getErrorMessage(err),
      },
      { status: 500 }
    );
  }
}
