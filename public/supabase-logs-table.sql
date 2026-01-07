-- Run this in your Supabase SQL Editor
-- Go to: Supabase Dashboard > SQL Editor > New Query

-- Create error_logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Error identification
  type TEXT NOT NULL, -- 'api_error', 'stream_error', 'ui_error', 'build_error', 'network_error'
  severity TEXT DEFAULT 'error', -- 'info', 'warning', 'error', 'critical'
  
  -- Error details
  message TEXT,
  stack TEXT,
  
  -- Context
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES projects(id),
  session_id TEXT,
  
  -- Request details (for API errors)
  endpoint TEXT,
  request_duration_ms INTEGER,
  request_payload JSONB,
  response_status INTEGER,
  response_body TEXT,
  
  -- Build details (for build errors)
  prompt TEXT,
  bytes_received INTEGER,
  last_valid_chunk TEXT,
  code_length INTEGER,
  
  -- Client info
  user_agent TEXT,
  url TEXT,
  
  -- Extra metadata
  metadata JSONB
);

-- Create index for faster queries
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_type ON error_logs(type);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);

-- Enable RLS but allow inserts from anyone (for logging)
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert logs
CREATE POLICY "Anyone can insert logs" ON error_logs
  FOR INSERT WITH CHECK (true);

-- Policy: Only authenticated users can view their own logs
CREATE POLICY "Users can view own logs" ON error_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Create a view for aggregated stats
CREATE OR REPLACE VIEW error_stats AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  type,
  severity,
  COUNT(*) as count,
  AVG(request_duration_ms) as avg_duration_ms
FROM error_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at), type, severity
ORDER BY hour DESC;

-- Grant access to the view
GRANT SELECT ON error_stats TO authenticated;
GRANT SELECT ON error_stats TO anon;
