-- SQL PARA MEMORIA PERSISTENTE DE USUARIO PANDORA BETA

CREATE TABLE IF NOT EXISTS user_memory_beta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL, -- Usaremos un ID persistente (UUID o email si hay auth)
    memory_key TEXT NOT NULL, -- ej: 'user_name', 'company', 'pref_currency'
    memory_value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice único por usuario y clave para permitir UPSERT
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_memory_unique ON user_memory_beta(user_id, memory_key);

-- Índice por user_id para búsquedas rápidas al cargar
CREATE INDEX IF NOT EXISTS idx_user_memory_search ON user_memory_beta(user_id);

-- Habilitar RLS
ALTER TABLE user_memory_beta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access user_memory_beta" ON user_memory_beta;
CREATE POLICY "Public full access user_memory_beta" ON user_memory_beta FOR ALL USING (true) WITH CHECK (true);
