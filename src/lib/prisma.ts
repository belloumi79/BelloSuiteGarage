import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Switch the pooler from session-mode (port 5432) to transaction-mode
 * (port 6543) so PgBouncer returns connections to the pool after each
 * transaction instead of pinning them per session.  This avoids
 * EMAXCONNSESSION errors when concurrent Vercel serverless functions
 * exhaust the pooler's 15-session limit.
 *
 * With transaction mode, N concurrent functions can share the same
 * 15-connection pool as long as they don't hold long-running transactions.
 *
 * The environment variable DATABASE_URL should be the session-mode URL:
 *   postgresql://postgres.<ref>:<password>@<region>.pooler.supabase.com:5432/postgres
 *
 * Prisma is configured with `pgbouncer=true` (simple-query protocol) which
 * is required for PgBouncer compatibility.
 */
function resolveDbUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');

  if (url.includes('pooler.supabase.com')) {
    const txUrl = url.replace(':5432/', ':6543/');
    const sep = txUrl.includes('?') ? '&' : '?';
    const params: string[] = [];
    if (!txUrl.includes('pgbouncer=')) params.push('pgbouncer=true');
    if (!txUrl.includes('connection_limit=')) params.push('connection_limit=3');
    if (!txUrl.includes('pool_timeout=')) params.push('pool_timeout=10');
    return params.length > 0 ? `${txUrl}${sep}${params.join('&')}` : txUrl;
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
