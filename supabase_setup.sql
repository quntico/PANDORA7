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
