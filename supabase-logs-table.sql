-- Buildr Analytics & Logging Table
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS buildr_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Request info
  request_type VARCHAR(50),
  user_message TEXT,
  
  -- AI Intent data
  intent_action VARCHAR(50),
  intent_target VARCHAR(100),
  intent_confidence DECIMAL(3,2),
  
  -- Request metadata
  has_uploaded_images BOOLEAN DEFAULT FALSE,
  duration_ms INTEGER,
  
  -- Result
  success BOOLEAN DEFAULT TRUE,
  validation_passed BOOLEAN,
  error TEXT
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_buildr_logs_created_at ON buildr_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buildr_logs_request_type ON buildr_logs(request_type);
CREATE INDEX IF NOT EXISTS idx_buildr_logs_success ON buildr_logs(success);

-- Example queries for analytics:

-- 1. Success rate by request type
-- SELECT request_type, 
--        COUNT(*) as total,
--        SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
--        ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 1) as success_rate
-- FROM buildr_logs
-- GROUP BY request_type
-- ORDER BY total DESC;

-- 2. Average response time
-- SELECT request_type,
--        ROUND(AVG(duration_ms)) as avg_ms,
--        ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)) as p95_ms
-- FROM buildr_logs
-- WHERE duration_ms IS NOT NULL
-- GROUP BY request_type;

-- 3. Most common failures
-- SELECT user_message, error, COUNT(*) as occurrences
-- FROM buildr_logs
-- WHERE success = FALSE
-- GROUP BY user_message, error
-- ORDER BY occurrences DESC
-- LIMIT 20;

-- 4. Validation failures (AI said done but didn't actually do it)
-- SELECT user_message, intent_action, intent_target
-- FROM buildr_logs
-- WHERE success = TRUE AND validation_passed = FALSE
-- ORDER BY created_at DESC
-- LIMIT 50;
