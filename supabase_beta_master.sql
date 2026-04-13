-- master_supabase_setup.sql
-- ESTA ES LA ÚNICA FUENTE DE VERDAD PARA EL ESQUEMA DE PANDORA BETA

-- 1. BUCKET DE ASSETS (Storage)
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public full access assets" ON storage.objects FOR ALL USING (bucket_id = 'assets') WITH CHECK (bucket_id = 'assets');

-- 2. TABLA MAESTRA DE PROYECTOS (Consolidada con todos los campos necesarios)
CREATE TABLE IF NOT EXISTS projects_beta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    version TEXT DEFAULT '1.0.0',
    priority TEXT DEFAULT 'medium',
    
    -- Campos traídos de la versión estable para compatibilidad total
    project_type TEXT,
    investment_amount NUMERIC DEFAULT 0,
    timeline INTEGER DEFAULT 12,
    current_stage TEXT,
    calculator_metrics JSONB DEFAULT '{}'::jsonb,
    analysis_results JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. CONTEXTO ESTRUCTURADO (Memoria técnica)
CREATE TABLE IF NOT EXISTS project_context_beta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects_beta(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. REGISTRO DE DECISIONES Y TAREAS (Memoria estratégica)
CREATE TABLE IF NOT EXISTS project_decisions_beta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects_beta(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    impact TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_tasks_beta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects_beta(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ARTEFACTOS Y DISEÑOS DE FLUJO (Memoria visual y operativa)
CREATE TABLE IF NOT EXISTS project_artifacts_beta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects_beta(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flow_designs_beta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects_beta(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    nodes JSONB DEFAULT '[]'::jsonb,
    edges JSONB DEFAULT '[]'::jsonb,
    custom_equipments JSONB DEFAULT '[]'::jsonb,
    layout JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. LOGS DE ACCIONES (Historial de chat y auditoría)
CREATE TABLE IF NOT EXISTS project_logs_beta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects_beta(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    source TEXT, -- 'user' | 'assistant' | 'system'
    result TEXT, -- Contenido de la respuesta o resultado de la acción
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. SEGURIDAD (Row Level Security - RLS)
-- Habilitar RLS en todo
ALTER TABLE projects_beta ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_context_beta ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_decisions_beta ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks_beta ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_artifacts_beta ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_designs_beta ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_logs_beta ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso total para desarrollo (Ajustar en producción real)
CREATE POLICY "Public full access projects_beta" ON projects_beta FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access project_context_beta" ON project_context_beta FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access project_decisions_beta" ON project_decisions_beta FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access project_tasks_beta" ON project_tasks_beta FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access project_artifacts_beta" ON project_artifacts_beta FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access flow_designs_beta" ON flow_designs_beta FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access project_logs_beta" ON project_logs_beta FOR ALL USING (true) WITH CHECK (true);

-- Indices para optimizar el rendimiento de la memoria
CREATE INDEX IF NOT EXISTS idx_logs_project ON project_logs_beta(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON project_tasks_beta(project_id, status);
CREATE INDEX IF NOT EXISTS idx_artifacts_project ON project_artifacts_beta(project_id, type);
