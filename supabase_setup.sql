-- 1. Asegurar que el bucket 'assets' exista y sea público
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Eliminar políticas antiguas para evitar conflictos (opcional, pero limpio)
DROP POLICY IF EXISTS "Public Access Select" ON storage.objects;
DROP POLICY IF EXISTS "Public Access Insert" ON storage.objects;
DROP POLICY IF EXISTS "Public Access Update" ON storage.objects;
DROP POLICY IF EXISTS "Public Access Delete" ON storage.objects;

-- 3. Crear políticas permisivas para el bucket 'assets'
-- Permitir ver archivos (SELECT)
CREATE POLICY "Public Access Select"
ON storage.objects FOR SELECT
USING ( bucket_id = 'assets' );

-- Permitir subir archivos (INSERT)
CREATE POLICY "Public Access Insert"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'assets' );

-- Permitir actualizar archivos (UPDATE)
CREATE POLICY "Public Access Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'assets' );

-- Permitir borrar archivos (DELETE)
CREATE POLICY "Public Access Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'assets' );


-- 4. Tablas para PANDORA BETA SYSTEM

-- Tabla principal de proyectos beta
CREATE TABLE IF NOT EXISTS projects_beta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    version TEXT DEFAULT '1.0.0',
    priority TEXT DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Contexto estructurado del proyecto
CREATE TABLE IF NOT EXISTS project_context_beta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects_beta(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Registro de decisiones
CREATE TABLE IF NOT EXISTS project_decisions_beta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects_beta(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    impact TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tareas del proyecto
CREATE TABLE IF NOT EXISTS project_tasks_beta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects_beta(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Artefactos generados (JSON)
CREATE TABLE IF NOT EXISTS project_artifacts_beta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects_beta(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Logs de acciones del sistema
CREATE TABLE IF NOT EXISTS project_logs_beta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects_beta(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    source TEXT,
    result TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Snapshots del estado del proyecto
CREATE TABLE IF NOT EXISTS project_snapshots_beta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects_beta(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    summary TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS en todas las tablas (opcional, pero recomendado)
-- Para simplificar el desarrollo inicial, daremos acceso total a anon si no hay auth estricto
ALTER TABLE projects_beta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access projects_beta" ON projects_beta FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE project_context_beta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access project_context_beta" ON project_context_beta FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE project_decisions_beta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access project_decisions_beta" ON project_decisions_beta FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE project_tasks_beta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access project_tasks_beta" ON project_tasks_beta FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE project_artifacts_beta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access project_artifacts_beta" ON project_artifacts_beta FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE project_logs_beta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access project_logs_beta" ON project_logs_beta FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE project_snapshots_beta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access project_snapshots_beta" ON project_snapshots_beta FOR ALL USING (true) WITH CHECK (true);

