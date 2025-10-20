-- Listar e remover todas as políticas duplicadas do property-images
DO $$ 
BEGIN
    -- Remove todas as políticas relacionadas a property-images
    DROP POLICY IF EXISTS "Authenticated users can upload property images" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload to property-images" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can update property-images" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can delete property-images" ON storage.objects;
    
    -- Mantém apenas as políticas corretas
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can upload to property-images'
    ) THEN
        CREATE POLICY "Users can upload to property-images"
        ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'property-images');
    END IF;
END $$;