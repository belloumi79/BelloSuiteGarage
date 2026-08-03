const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

function resolveDbUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');

  if (url.includes('pooler.supabase.com')) {
    const txUrl = url.replace(':5432/', ':6543/');
    const sep = txUrl.includes('?') ? '&' : '?';
    const params = [];
    if (!txUrl.includes('pgbouncer=')) params.push('pgbouncer=true');
    if (!txUrl.includes('connection_limit=')) params.push('connection_limit=3');
    if (!txUrl.includes('pool_timeout=')) params.push('pool_timeout=10');
    return params.length > 0 ? `${txUrl}${sep}${params.join('&')}` : txUrl;
  }
  return url;
}

async function main() {
  const dbUrl = resolveDbUrl();
  const adapter = new PrismaPg({ connectionString: dbUrl });
  const prisma = new PrismaClient({ adapter });
  
  // Update garage to enterprise annual
  const garage = await prisma.garages.update({
    where: { id: 'b465a45e-5604-4055-9605-cd8c453534ca' },
    data: {
      subscription_plan: 'enterprise',
      subscription_status: 'active',
      subscription_started_at: new Date(),
      subscription_renewal_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      trial_end_date: null,
    }
  });
  
  console.log('Garage updated:', JSON.stringify(garage, null, 2));
  
  await prisma.$disconnect();
} 

main().catch(console.error);