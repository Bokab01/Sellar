-- =============================================
-- SELLAR MOBILE APP - FIX EXTENSION SECURITY (SAFE VERSION)
-- Migration 32b: Move extensions from public schema to dedicated schema
-- =============================================

-- This version safely handles functions that might not exist
-- Each function is wrapped in a DO block with exception handling

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
-- 4. CREATE SECURE WRAPPER FUNCTIONS IN PUBLIC SCHEMA
-- =============================================

-- Instead of trying to update existing functions that might not exist,
-- create secure wrapper functions in the public schema that can be used safely

-- Create secure wrapper for similarity function
CREATE OR REPLACE FUNCTION public.similarity(text, text)
RETURNS float4
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = 'extensions'
AS $$
    SELECT extensions.similarity($1, $2);
$$;

-- Create secure wrapper for word_similarity function
CREATE OR REPLACE FUNCTION public.word_similarity(text, text)
RETURNS float4
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = 'extensions'
AS $$
    SELECT extensions.word_similarity($1, $2);
$$;

-- Create secure wrapper for similarity_escape function
CREATE OR REPLACE FUNCTION public.similarity_escape(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = 'extensions'
AS $$
    SELECT extensions.show_limit();
$$;

-- Create secure wrapper for unaccent function
CREATE OR REPLACE FUNCTION public.unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = 'extensions'
AS $$
    SELECT extensions.unaccent($1);
$$;

-- =============================================
-- 5. SAFELY UPDATE EXISTING FUNCTIONS
-- =============================================

-- Update functions that use these extensions to include the extensions schema
-- This ensures they can still find the extension functions

-- Safely update search_listings function if it exists (try different signatures)
DO $$
DECLARE
    func_exists BOOLEAN := FALSE;
BEGIN
    -- Try to find search_listings with various possible signatures
    
    -- Try signature 1: 9 parameters with decimal
    BEGIN
        SELECT TRUE INTO func_exists
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
        AND p.proname = 'search_listings'
        AND p.pronargs = 9;
        
        IF func_exists THEN
            BEGIN
                -- Try with decimal type
                ALTER FUNCTION search_listings(text, text[], text, text, decimal, decimal, text, integer, integer) 
                SET search_path = 'public, extensions';
                RAISE NOTICE 'Updated search_listings function (9 params, decimal) to use extensions schema';
            EXCEPTION WHEN undefined_function THEN
                -- Try with numeric type
                BEGIN
                    ALTER FUNCTION search_listings(text, text[], text, text, numeric, numeric, text, integer, integer) 
                    SET search_path = 'public, extensions';
                    RAISE NOTICE 'Updated search_listings function (9 params, numeric) to use extensions schema';
                EXCEPTION WHEN undefined_function THEN
                    RAISE NOTICE 'Could not update search_listings with 9 parameters';
                END;
            END;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Continue to next attempt
    END;
    
    -- Try signature 2: fewer parameters
    IF NOT func_exists THEN
        BEGIN
            SELECT TRUE INTO func_exists
            FROM pg_proc p 
            JOIN pg_namespace n ON p.pronamespace = n.oid 
            WHERE n.nspname = 'public' 
            AND p.proname = 'search_listings'
            AND p.pronargs < 9;
            
            IF func_exists THEN
                BEGIN
                    ALTER FUNCTION search_listings(text) SET search_path = 'public, extensions';
                    RAISE NOTICE 'Updated search_listings function (simple) to use extensions schema';
                EXCEPTION WHEN undefined_function THEN
                    RAISE NOTICE 'Could not update simple search_listings function';
                END;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Continue
        END;
    END IF;
    
    -- If no search_listings function found
    IF NOT func_exists THEN
        RAISE NOTICE 'No search_listings function found - skipping update';
    END IF;
END $$;

-- Safely update any other functions that might use pg_trgm or unaccent
DO $$
DECLARE
    func_record RECORD;
    update_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Updating functions that might use text search extensions...';
    
    -- Find functions that might use text search extensions
    FOR func_record IN 
        SELECT p.proname, n.nspname, p.oid
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND (
            p.proname ILIKE '%search%' OR 
            p.proname ILIKE '%text%' OR
            p.proname ILIKE '%similarity%'
        )
        AND p.proname != 'similarity' -- Skip our wrapper functions
        AND p.proname != 'word_similarity'
        AND p.proname != 'unaccent'
    LOOP
        BEGIN
            -- Use a more specific approach to avoid parameter signature issues
            EXECUTE format('ALTER FUNCTION %I SET search_path = ''public, extensions''', 
                          func_record.oid::regprocedure);
            update_count := update_count + 1;
            RAISE NOTICE 'Updated function % to use extensions schema', func_record.proname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not update function %: %', func_record.proname, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Updated % functions to use extensions schema', update_count;
END $$;

-- =============================================
-- 6. GRANT NECESSARY PERMISSIONS
-- =============================================

-- Ensure all roles can use the extensions in their new location
GRANT USAGE ON SCHEMA extensions TO public;
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;
GRANT USAGE ON SCHEMA extensions TO anon;

-- Grant execute permissions on our wrapper functions
GRANT EXECUTE ON FUNCTION public.similarity(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.similarity(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.word_similarity(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.word_similarity(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.unaccent(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unaccent(text) TO anon;

-- =============================================
-- 7. VERIFY EXTENSION LOCATIONS
-- =============================================

-- Check current extension locations
DO $$
DECLARE
    ext_record RECORD;
    public_extensions INTEGER := 0;
    total_extensions INTEGER := 0;
    wrapper_functions INTEGER := 0;
BEGIN
    RAISE NOTICE 'Extension Security Status Report:';
    RAISE NOTICE '================================';
    
    -- Check extension locations
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
    
    -- Check wrapper functions
    SELECT COUNT(*) INTO wrapper_functions
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN ('similarity', 'word_similarity', 'unaccent')
    AND p.prosecdef = true; -- Security definer
    
    RAISE NOTICE 'Secure wrapper functions created: %', wrapper_functions;
    
    -- Summary
    RAISE NOTICE '================================';
    IF public_extensions = 0 THEN
        RAISE NOTICE 'SUCCESS: All extensions moved to secure schemas! ✓';
    ELSE
        RAISE NOTICE 'WARNING: % extensions still in public schema ✗', public_extensions;
    END IF;
    
    IF wrapper_functions >= 3 THEN
        RAISE NOTICE 'SUCCESS: Secure wrapper functions created! ✓';
    ELSE
        RAISE NOTICE 'WARNING: Some wrapper functions may be missing ✗';
    END IF;
END $$;

-- =============================================
-- 8. UPDATE DOCUMENTATION
-- =============================================

-- Add comments to document the security improvements
COMMENT ON SCHEMA extensions IS 'Dedicated schema for PostgreSQL extensions - moved from public for security';
COMMENT ON FUNCTION public.similarity(text, text) IS 'Secure wrapper for pg_trgm similarity function';
COMMENT ON FUNCTION public.word_similarity(text, text) IS 'Secure wrapper for pg_trgm word_similarity function';
COMMENT ON FUNCTION public.unaccent(text) IS 'Secure wrapper for unaccent function';

-- =============================================
-- 9. FINAL SECURITY VERIFICATION
-- =============================================

-- Perform final security check
DO $$
DECLARE
    security_score INTEGER := 0;
    max_score INTEGER := 4;
BEGIN
    RAISE NOTICE 'Final Security Assessment:';
    RAISE NOTICE '========================';
    
    -- Check 1: Extensions not in public
    IF NOT EXISTS (
        SELECT 1 FROM pg_extension e 
        JOIN pg_namespace n ON e.extnamespace = n.oid 
        WHERE e.extname IN ('pg_trgm', 'unaccent') AND n.nspname = 'public'
    ) THEN
        security_score := security_score + 1;
        RAISE NOTICE '✓ Extensions moved from public schema';
    ELSE
        RAISE NOTICE '✗ Some extensions still in public schema';
    END IF;
    
    -- Check 2: Extensions schema exists
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'extensions') THEN
        security_score := security_score + 1;
        RAISE NOTICE '✓ Dedicated extensions schema created';
    ELSE
        RAISE NOTICE '✗ Extensions schema not found';
    END IF;
    
    -- Check 3: Wrapper functions exist
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'similarity' AND p.prosecdef = true
    ) THEN
        security_score := security_score + 1;
        RAISE NOTICE '✓ Secure wrapper functions created';
    ELSE
        RAISE NOTICE '✗ Wrapper functions missing';
    END IF;
    
    -- Check 4: Proper permissions granted
    IF EXISTS (
        SELECT 1 FROM pg_namespace WHERE nspname = 'extensions'
        AND has_schema_privilege('authenticated', 'extensions', 'USAGE')
    ) THEN
        security_score := security_score + 1;
        RAISE NOTICE '✓ Proper permissions granted';
    ELSE
        RAISE NOTICE '✗ Permission issues detected';
    END IF;
    
    RAISE NOTICE '========================';
    RAISE NOTICE 'Security Score: %/% (% percent secure)', 
                security_score, max_score, (security_score * 100 / max_score);
    
    IF security_score = max_score THEN
        RAISE NOTICE 'EXCELLENT: Extension security fully implemented! 🛡️';
    ELSIF security_score >= 3 THEN
        RAISE NOTICE 'GOOD: Most security measures implemented ✓';
    ELSE
        RAISE NOTICE 'WARNING: Security improvements needed ⚠️';
    END IF;
END $$;

-- Success message
SELECT 'Extension security migration completed!' as status,
       'Extensions moved to secure schema with wrapper functions' as details;
