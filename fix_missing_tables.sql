-- SQL para solucionar las tablas faltantes detectadas en los logs (Error 404)

-- 1. Tabla de Proyectos (Usada por ProjectContext)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    project_type TEXT,
    investment_amount NUMERIC DEFAULT 0,
    timeline INTEGER DEFAULT 12,
    current_stage TEXT,
    calculator_metrics JSONB DEFAULT '{}'::jsonb,
    analysis_results JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para la tabla projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access projects" ON projects;
CREATE POLICY "Public full access projects" ON projects FOR ALL USING (true) WITH CHECK (true);

-- 2. Tabla de Diseños de Flujo (Usada por FlowDesigner y useFlowDesigns)
CREATE TABLE IF NOT EXISTS flow_designs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    nodes JSONB DEFAULT '[]'::jsonb,
    edges JSONB DEFAULT '[]'::jsonb,
    custom_equipments JSONB DEFAULT '[]'::jsonb,
    layout JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para la tabla flow_designs
ALTER TABLE flow_designs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access flow_designs" ON flow_designs;
CREATE POLICY "Public full access flow_designs" ON flow_designs FOR ALL USING (true) WITH CHECK (true);

-- 3. Asegurar que el bucket 'assets' permita acceso público (si no se ejecutó correctamente antes)
-- Esto es crítico para los modelos 3D del Flow Designer
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;
