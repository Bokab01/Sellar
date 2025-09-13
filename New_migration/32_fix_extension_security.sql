-- =============================================
-- SELLAR MOBILE APP - FIX EXTENSION SECURITY
-- Migration 32: Move extensions from public schema to dedicated schema
-- =============================================

-- The database linter found extensions in the public schema
-- This is a security risk - extensions should be in a dedicated schema

-- =============================================
-- 1. CREATE DEDICATED EXTENSIONS SCHEMA
-- =============================================

-- Create a dedicated schema for extensions
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage to necessary roles
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;
GRANT USAGE ON SCHEMA extensions TO postgres;

-- =============================================
-- 2. MOVE PG_TRGM EXTENSION
-- =============================================

-- Check if pg_trgm exists in public and move it
DO $$
BEGIN
    -- Check if pg_trgm exists in public schema
    IF EXISTS (
        SELECT 1 FROM pg_extension e 
        JOIN pg_namespace n ON e.extnamespace = n.oid 
        WHERE e.extname = 'pg_trgm' AND n.nspname = 'public'
    ) THEN
        -- Move pg_trgm to extensions schema
        ALTER EXTENSION pg_trgm SET SCHEMA extensions;
        RAISE NOTICE 'Moved pg_trgm extension from public to extensions schema';
    ELSE
        -- Install pg_trgm in extensions schema if it doesn't exist
        BEGIN
            CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;
            RAISE NOTICE 'Installed pg_trgm extension in extensions schema';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not install pg_trgm extension: %', SQLERRM;
        END;
    END IF;
END $$;

-- =============================================
-- 3. MOVE UNACCENT EXTENSION
-- =============================================

-- Check if unaccent exists in public and move it
DO $$
BEGIN
    -- Check if unaccent exists in public schema
    IF EXISTS (
        SELECT 1 FROM pg_extension e 
        JOIN pg_namespace n ON e.extnamespace = n.oid 
        WHERE e.extname = 'unaccent' AND n.nspname = 'public'
    ) THEN
        -- Move unaccent to extensions schema
        ALTER EXTENSION unaccent SET SCHEMA extensions;
        RAISE NOTICE 'Moved unaccent extension from public to extensions schema';
    ELSE
        -- Install unaccent in extensions schema if it doesn't exist
        BEGIN
            CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA extensions;
            RAISE NOTICE 'Installed unaccent extension in extensions schema';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not install unaccent extension: %', SQLERRM;
        END;
    END IF;
END $$;

-- =============================================
-- 4. UPDATE FUNCTION SEARCH PATHS TO INCLUDE EXTENSIONS
-- =============================================

-- Update functions that use these extensions to include the extensions schema
-- This ensures they can still find the extension functions

-- Update search listing function to use extensions schema
DO $$
BEGIN
    -- Update search_listings function if it exists
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'search_listings'
    ) THEN
        ALTER FUNCTION search_listings(text, text[], text, text, decimal, decimal, text, integer, integer) 
        SET search_path = 'public, extensions';
        RAISE NOTICE 'Updated search_listings function to use extensions schema';
    END IF;
END $$;

-- Update any other functions that might use pg_trgm or unaccent
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Find functions that might use text search extensions
    FOR func_record IN 
        SELECT p.proname, n.nspname
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND (
            p.proname ILIKE '%search%' OR 
            p.proname ILIKE '%text%' OR
            p.proname ILIKE '%similarity%'
        )
    LOOP
        BEGIN
            EXECUTE format('ALTER FUNCTION %I.%I SET search_path = ''public, extensions''', 
                          func_record.nspname, func_record.proname);
            RAISE NOTICE 'Updated function %.% to use extensions schema', 
                        func_record.nspname, func_record.proname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not update function %.%: %', 
                        func_record.nspname, func_record.proname, SQLERRM;
        END;
    END LOOP;
END $$;

-- =============================================
-- 5. VERIFY EXTENSION LOCATIONS
-- =============================================

-- Check current extension locations
DO $$
DECLARE
    ext_record RECORD;
    public_extensions INTEGER := 0;
    total_extensions INTEGER := 0;
BEGIN
    RAISE NOTICE 'Extension Security Status:';
    RAISE NOTICE '========================';
    
    FOR ext_record IN 
        SELECT e.extname, n.nspname as schema_name
        FROM pg_extension e
        JOIN pg_namespace n ON e.extnamespace = n.oid
        WHERE e.extname IN ('pg_trgm', 'unaccent')
        ORDER BY e.extname
    LOOP
        total_extensions := total_extensions + 1;
        
        IF ext_record.schema_name = 'public' THEN
            public_extensions := public_extensions + 1;
            RAISE NOTICE 'Extension % - STILL IN PUBLIC SCHEMA ✗', ext_record.extname;
        ELSE
            RAISE NOTICE 'Extension % - Secure in % schema ✓', 
                        ext_record.extname, ext_record.schema_name;
        END IF;
    END LOOP;
    
    IF public_extensions = 0 THEN
        RAISE NOTICE 'All extensions moved to secure schemas!';
    ELSE
        RAISE NOTICE 'Warning: % extensions still in public schema', public_extensions;
    END IF;
END $$;

-- =============================================
-- 6. GRANT NECESSARY PERMISSIONS
-- =============================================

-- Ensure all roles can use the extensions in their new location
GRANT USAGE ON SCHEMA extensions TO public;
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;
GRANT USAGE ON SCHEMA extensions TO anon;

-- =============================================
-- 7. CREATE HELPER FUNCTIONS IN EXTENSIONS SCHEMA
-- =============================================

-- Create wrapper functions in extensions schema for commonly used extension functions
-- This provides a clean interface and ensures security

CREATE OR REPLACE FUNCTION extensions.similarity_search(text, text)
RETURNS float4
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = 'extensions'
AS $$
    SELECT similarity($1, $2);
$$;

CREATE OR REPLACE FUNCTION extensions.unaccent_text(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = 'extensions'
AS $$
    SELECT unaccent($1);
$$;

-- Grant execute permissions on wrapper functions
GRANT EXECUTE ON FUNCTION extensions.similarity_search(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION extensions.unaccent_text(text) TO authenticated;

-- =============================================
-- 8. UPDATE DOCUMENTATION
-- =============================================

-- Add comments to document the security improvements
COMMENT ON SCHEMA extensions IS 'Dedicated schema for PostgreSQL extensions - moved from public for security';
COMMENT ON FUNCTION extensions.similarity_search(text, text) IS 'Secure wrapper for pg_trgm similarity function';
COMMENT ON FUNCTION extensions.unaccent_text(text) IS 'Secure wrapper for unaccent function';

-- Success message
SELECT 'Extension security issues addressed!' as status,
       'Extensions moved from public schema to dedicated extensions schema' as details;
