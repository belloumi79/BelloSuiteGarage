ALTER TABLE IF EXISTS public.garages 
  ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS trial_end_date date,
  ADD COLUMN IF NOT EXISTS subscription_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_renewal_date date,
  ADD COLUMN IF NOT EXISTS activation_code text,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
