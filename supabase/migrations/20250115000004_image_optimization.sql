-- =============================================
-- IMAGE OPTIMIZATION SYSTEM
-- Phase 1: Storage Optimization
-- =============================================

-- Create image_optimizations table for tracking
CREATE TABLE IF NOT EXISTS image_optimizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    bucket TEXT NOT NULL,
    original_path TEXT NOT NULL,
    original_size INTEGER NOT NULL,
    variants_created INTEGER DEFAULT 0,
    total_savings INTEGER DEFAULT 0,
    compression_ratio DECIMAL(5,2) DEFAULT 0.00,
    optimization_status TEXT DEFAULT 'pending' CHECK (optimization_status IN ('pending', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- Add foreign key constraint if profiles table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'image_optimizations_user_id_fkey' 
            AND table_name = 'image_optimizations'
        ) THEN
            ALTER TABLE image_optimizations 
            ADD CONSTRAINT image_optimizations_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_image_optimizations_user_id ON image_optimizations(user_id);
CREATE INDEX IF NOT EXISTS idx_image_optimizations_bucket ON image_optimizations(bucket);
CREATE INDEX IF NOT EXISTS idx_image_optimizations_status ON image_optimizations(optimization_status);
CREATE INDEX IF NOT EXISTS idx_image_optimizations_created_at ON image_optimizations(created_at DESC);

-- Enable RLS
ALTER TABLE image_optimizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own image optimizations" ON image_optimizations
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own image optimizations" ON image_optimizations
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own image optimizations" ON image_optimizations
FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- IMAGE OPTIMIZATION ANALYTICS FUNCTIONS
-- =============================================

-- Function to get user's image optimization stats
CREATE OR REPLACE FUNCTION get_image_optimization_stats(user_uuid UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_optimizations', COUNT(*),
        'total_original_size', COALESCE(SUM(original_size), 0),
        'total_savings', COALESCE(SUM(total_savings), 0),
        'average_compression_ratio', COALESCE(AVG(compression_ratio), 0),
        'total_variants_created', COALESCE(SUM(variants_created), 0),
        'successful_optimizations', COUNT(*) FILTER (WHERE optimization_status = 'completed'),
        'failed_optimizations', COUNT(*) FILTER (WHERE optimization_status = 'failed'),
        'pending_optimizations', COUNT(*) FILTER (WHERE optimization_status = 'pending')
    ) INTO stats
    FROM image_optimizations
    WHERE user_id = user_uuid;
    
    RETURN stats;
END;
$$;

-- Function to get optimization history
CREATE OR REPLACE FUNCTION get_optimization_history(
    user_uuid UUID DEFAULT auth.uid(),
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    bucket TEXT,
    original_path TEXT,
    original_size INTEGER,
    variants_created INTEGER,
    total_savings INTEGER,
    compression_ratio DECIMAL(5,2),
    optimization_status TEXT,
    created_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        io.id,
        io.bucket,
        io.original_path,
        io.original_size,
        io.variants_created,
        io.total_savings,
        io.compression_ratio,
        io.optimization_status,
        io.created_at,
        io.completed_at
    FROM image_optimizations io
    WHERE io.user_id = user_uuid
    ORDER BY io.created_at DESC
    LIMIT limit_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_image_optimization_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_optimization_history(UUID, INTEGER) TO authenticated;

-- =============================================
-- STORAGE BUCKET POLICIES UPDATE
-- =============================================

-- Update storage policies to allow optimized image variants
DO $$
BEGIN
    -- Allow authenticated users to upload optimized variants
    -- This is needed for the image optimization edge function
    
    -- Note: The actual storage policies should be configured in the Supabase dashboard
    -- or via the storage policies migration file
    
    NULL; -- Placeholder for storage policy updates
END $$;

-- =============================================
-- VERIFICATION
-- =============================================

SELECT 'Image optimization system setup completed successfully!' as status;

-- Show table information
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'image_optimizations'
    AND table_schema = 'public'
ORDER BY ordinal_position;
