-- Ejecuta este SQL en:
-- https://supabase.com/dashboard/project/tbqoreremmusplbznmfn/sql/new

CREATE TABLE IF NOT EXISTS rider_daily_reqs (
  box_id        TEXT PRIMARY KEY,
  required_daily INTEGER NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Row Level Security (permite acceso anónimo)
ALTER TABLE rider_daily_reqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_rider_reqs" ON rider_daily_reqs
  FOR ALL USING (true) WITH CHECK (true);
