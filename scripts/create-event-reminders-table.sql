-- Create event_reminders table
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

-- Add foreign key constraints
ALTER TABLE "public"."event_reminders" 
    ADD CONSTRAINT "event_reminders_event_id_fkey" 
    FOREIGN KEY ("event_id") REFERENCES "public"."agenda_events"("id") ON DELETE CASCADE;

ALTER TABLE "public"."event_reminders" 
    ADD CONSTRAINT "event_reminders_garage_id_fkey" 
    FOREIGN KEY ("garage_id") REFERENCES "public"."garages"("id") ON DELETE CASCADE;

ALTER TABLE "public"."event_reminders" 
    ADD CONSTRAINT "event_reminders_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_event_reminders_garage_time" ON "public"."event_reminders" ("garage_id", "reminder_time");
CREATE INDEX IF NOT EXISTS "idx_event_reminders_event" ON "public"."event_reminders" ("event_id");
CREATE INDEX IF NOT EXISTS "idx_event_reminders_user_time" ON "public"."event_reminders" ("user_id", "reminder_time");

-- Add reminders relation to agenda_events (already added via FK above, but we can add the inverse reference note)
-- The Prisma relation is handled by the FK above