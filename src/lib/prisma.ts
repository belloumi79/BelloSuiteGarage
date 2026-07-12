import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Use Supabase's connection pooler with `pool_timeout` so PgBouncer waits up
 * to 30 seconds for a slot instead of immediately failing with
 * EMAXCONNSESSION when the 15-session limit is momentarily exhausted by
 * concurrent Vercel serverless functions.
 *
 * The environment variable DATABASE_URL should be the pooler URL:
 *   postgresql://postgres.<ref>:<password>@<region>.pooler.supabase.com:5432/postgres
 */
function resolveDbUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');

  if (url.includes('pooler.supabase.com')) {
    const sep = url.includes('?') ? '&' : '?';
    const params: string[] = [];
    if (!url.includes('pgbouncer=')) params.push('pgbouncer=true');
    if (!url.includes('connection_limit=')) params.push('connection_limit=1');
    if (!url.includes('pool_timeout=')) params.push('pool_timeout=30');
    return params.length > 0 ? `${url}${sep}${params.join('&')}` : url;
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
