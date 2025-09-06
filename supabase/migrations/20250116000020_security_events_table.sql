-- Security Events Table Migration
-- Creates table for logging security-related events

-- Create security_events table
CREATE TABLE IF NOT EXISTS security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  user_id UUID,
  email TEXT,
  ip_address INET,
  user_agent TEXT,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

-- Add missing columns if they don't exist
DO $$ BEGIN
  -- Add event_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'security_events' 
    AND column_name = 'event_type'
  ) THEN
    ALTER TABLE security_events ADD COLUMN event_type TEXT NOT NULL DEFAULT 'suspicious_activity';
  END IF;
END $$;

DO $$ BEGIN
  -- Add severity column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'security_events' 
    AND column_name = 'severity'
  ) THEN
    ALTER TABLE security_events ADD COLUMN severity TEXT NOT NULL DEFAULT 'medium';
  END IF;
END $$;

DO $$ BEGIN
  -- Add user_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'security_events' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE security_events ADD COLUMN user_id UUID;
  END IF;
END $$;

DO $$ BEGIN
  -- Add email column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'security_events' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE security_events ADD COLUMN email TEXT;
  END IF;
END $$;

DO $$ BEGIN
  -- Add ip_address column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'security_events' 
    AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE security_events ADD COLUMN ip_address INET;
  END IF;
END $$;

DO $$ BEGIN
  -- Add user_agent column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'security_events' 
    AND column_name = 'user_agent'
  ) THEN
    ALTER TABLE security_events ADD COLUMN user_agent TEXT;
  END IF;
END $$;

DO $$ BEGIN
  -- Add details column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'security_events' 
    AND column_name = 'details'
  ) THEN
    ALTER TABLE security_events ADD COLUMN details JSONB NOT NULL DEFAULT '{}';
  END IF;
END $$;

DO $$ BEGIN
  -- Add processed_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'security_events' 
    AND column_name = 'processed_at'
  ) THEN
    ALTER TABLE security_events ADD COLUMN processed_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  -- Add resolved_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'security_events' 
    AND column_name = 'resolved_at'
  ) THEN
    ALTER TABLE security_events ADD COLUMN resolved_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add constraints after ensuring columns exist
DO $$ BEGIN
  -- Add event_type constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'security_events_event_type_check'
    AND table_name = 'security_events'
  ) THEN
    ALTER TABLE security_events ADD CONSTRAINT security_events_event_type_check 
    CHECK (event_type IN ('input_threat', 'failed_login', 'suspicious_activity', 'rate_limit_exceeded', 'account_lockout'));
  END IF;
END $$;

DO $$ BEGIN
  -- Add severity constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'security_events_severity_check'
    AND table_name = 'security_events'
  ) THEN
    ALTER TABLE security_events ADD CONSTRAINT security_events_severity_check 
    CHECK (severity IN ('low', 'medium', 'high', 'critical'));
  END IF;
END $$;

DO $$ BEGIN
  -- Add foreign key constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'security_events_user_id_fkey'
    AND table_name = 'security_events'
  ) THEN
    ALTER TABLE security_events ADD CONSTRAINT security_events_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_email ON security_events(email);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_unprocessed ON security_events(created_at) WHERE processed_at IS NULL;

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_security_events_type_severity ON security_events(event_type, severity);
CREATE INDEX IF NOT EXISTS idx_security_events_user_recent ON security_events(user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Only service role can insert security events
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'security_events' 
    AND policyname = 'security_events_insert_policy'
  ) THEN
    CREATE POLICY security_events_insert_policy ON security_events
      FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- Only service role and authenticated users can read their own events
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'security_events' 
    AND policyname = 'security_events_select_policy'
  ) THEN
    CREATE POLICY security_events_select_policy ON security_events
      FOR SELECT
      USING (
        auth.role() = 'service_role' OR 
        (auth.uid() IS NOT NULL AND user_id = auth.uid())
      );
  END IF;
END $$;

-- Only service role can update security events
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'security_events' 
    AND policyname = 'security_events_update_policy'
  ) THEN
    CREATE POLICY security_events_update_policy ON security_events
      FOR UPDATE
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Create function to get security statistics
CREATE OR REPLACE FUNCTION get_security_stats(
  timeframe_hours INTEGER DEFAULT 24
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  since_timestamp TIMESTAMPTZ;
BEGIN
  -- Only allow service role to access this function
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: insufficient privileges';
  END IF;

  since_timestamp := NOW() - (timeframe_hours || ' hours')::INTERVAL;

  SELECT json_build_object(
    'total_events', COUNT(*),
    'events_by_type', json_object_agg(event_type, type_count),
    'events_by_severity', json_object_agg(severity, severity_count),
    'recent_critical', critical_events
  ) INTO result
  FROM (
    SELECT 
      event_type,
      severity,
      COUNT(*) OVER (PARTITION BY event_type) as type_count,
      COUNT(*) OVER (PARTITION BY severity) as severity_count,
      CASE WHEN severity = 'critical' THEN 
        json_agg(json_build_object(
          'id', id,
          'event_type', event_type,
          'created_at', created_at,
          'details', details
        )) OVER (PARTITION BY severity) 
      ELSE NULL END as critical_events
    FROM security_events
    WHERE created_at >= since_timestamp
  ) stats;

  RETURN COALESCE(result, '{}'::JSON);
END;
$$;

-- Create function to clean up old security events
CREATE OR REPLACE FUNCTION cleanup_old_security_events(
  retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
  cutoff_date TIMESTAMPTZ;
BEGIN
  -- Only allow service role to access this function
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: insufficient privileges';
  END IF;

  cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;

  -- Delete old events, but keep critical events for longer
  DELETE FROM security_events
  WHERE created_at < cutoff_date
    AND (
      severity != 'critical' 
      OR created_at < NOW() - (retention_days * 2 || ' days')::INTERVAL
    );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Create function to mark events as processed
CREATE OR REPLACE FUNCTION mark_security_events_processed(
  event_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Only allow service role to access this function
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: insufficient privileges';
  END IF;

  UPDATE security_events
  SET processed_at = NOW()
  WHERE id = ANY(event_ids)
    AND processed_at IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON TABLE security_events TO service_role;
GRANT EXECUTE ON FUNCTION get_security_stats(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_security_events(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION mark_security_events_processed(UUID[]) TO service_role;

-- Add comment for documentation
COMMENT ON TABLE security_events IS 'Stores security-related events for monitoring and analysis';
COMMENT ON FUNCTION get_security_stats(INTEGER) IS 'Returns security statistics for the specified timeframe';
COMMENT ON FUNCTION cleanup_old_security_events(INTEGER) IS 'Cleans up old security events based on retention policy';
COMMENT ON FUNCTION mark_security_events_processed(UUID[]) IS 'Marks security events as processed';
