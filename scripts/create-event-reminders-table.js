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
  
  try {
    // Create event_reminders table
    console.log('Creating event_reminders table...');
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "public"."event_reminders" (
          "id" UUID NOT NULL DEFAULT gen_random_uuid(),
          "garage_id" UUID NOT NULL,
          "event_id" UUID NOT NULL,
          "user_id" UUID NOT NULL,
          "reminder_time" TIMESTAMPTZ(6) NOT NULL,
          "channel" VARCHAR(20) NOT NULL DEFAULT 'in_app',
          "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
          "message" TEXT,
          "sent_at" TIMESTAMPTZ(6),
          "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
          CONSTRAINT "event_reminders_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('Table created');
    
    // Add foreign key constraints
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "public"."event_reminders" 
          ADD CONSTRAINT "event_reminders_event_id_fkey" 
          FOREIGN KEY ("event_id") REFERENCES "public"."agenda_events"("id") ON DELETE CASCADE;
    `);
    console.log('FK event_id added');
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "public"."event_reminders" 
          ADD CONSTRAINT "event_reminders_garage_id_fkey" 
          FOREIGN KEY ("garage_id") REFERENCES "public"."garages"("id") ON DELETE CASCADE;
    `);
    console.log('FK garage_id added');
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "public"."event_reminders" 
          ADD CONSTRAINT "event_reminders_user_id_fkey" 
          FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
    `);
    console.log('FK user_id added');
    
    // Create indexes
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_event_reminders_garage_time" ON "public"."event_reminders" ("garage_id", "reminder_time");
    `);
    console.log('Index garage_time created');
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_event_reminders_event" ON "public"."event_reminders" ("event_id");
    `);
    console.log('Index event created');
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_event_reminders_user_time" ON "public"."event_reminders" ("user_id", "reminder_time");
    `);
    console.log('Index user_time created');
    
    console.log('All done!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
} 

main().catch(console.error);