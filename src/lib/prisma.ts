import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Supabase's connection pooler (pooler.supabase.com, transaction mode) does
 * not support Prisma's prepared statements and can exhaust its connection
 * limit under serverless concurrency. Appending `pgbouncer=true` makes Prisma
 * avoid prepared statements, and `connection_limit=1` caps the pool per
 * lambda. Without these, requests fail intermittently with 500/401 on Vercel.
 * The params are harmless on a direct connection and on local dev.
 */
function normalizeDbUrl(url: string): string {
  if (url.includes('pooler.supabase.com') && !url.includes('pgbouncer=')) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}pgbouncer=true&connection_limit=1`;
  }
  return url;
}

function getClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    throw new Error('DATABASE_URL is not set.');
  }

  const dbUrl = normalizeDbUrl(rawUrl);
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
