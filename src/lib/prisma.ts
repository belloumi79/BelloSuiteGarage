import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Use the direct database connection instead of Supabase's connection pooler
 * to avoid EMAXCONNSESSION errors (pooler caps at 15 concurrent sessions,
 * exhausted by Vercel serverless concurrency).
 *
 * Mapping: pooler host "*.pooler.supabase.com:5432" -> "db.<ref>.supabase.co:5432"
 * Fallback: if DATABASE_URL does not contain a pooler host, use it as-is.
 */
function resolveDbUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');

  if (url.includes('pooler.supabase.com')) {
    const admin = url.split('@')[0] ?? '';
    const ref = admin.split('.')[1]?.split(':')[0] ?? '';
    return url.replace(
      /aws-0-eu-west-1\.pooler\.supabase\.com:5432/,
      `db.${ref}.supabase.co:5432`,
    );
  }
  return url;
}

function getClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const dbUrl = resolveDbUrl();
  const adapter = new PrismaPg({ connectionString: dbUrl });
  globalForPrisma.prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  return globalForPrisma.prisma;
}

const errMsg = 'Prisma is not initialized. Ensure DATABASE_URL is set in your Vercel environment variables.';

function lazyError(): never {
  throw new Error(errMsg);
}

const errorProxy = new Proxy<Record<string, unknown>>({}, {
  get() { return lazyError; },
  apply() { lazyError(); },
});

export const prisma = new Proxy<PrismaClient>({} as PrismaClient, {
  get(_, prop) {
    if (typeof prop === 'symbol' || prop === 'then' || prop === 'constructor') return undefined;

    if (!globalForPrisma.prisma) {
      try {
        globalForPrisma.prisma = getClient();
      } catch {
        return errorProxy;
      }
    }

    const value = (globalForPrisma.prisma as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(globalForPrisma.prisma) : value;
  },
});
