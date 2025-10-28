-- Migration: Make business hours optional
-- Date: 2025-10-26
-- Description: Adds 'enabled' field to businessHours to make it optional
-- Not all chatbots need business hours (e.g., 24/7 chatbots, non-business chatbots)

-- Update existing chatbots to add enabled: false by default
UPDATE chatbots
SET config = jsonb_set(
  COALESCE(config::jsonb, '{}'::jsonb),
  '{businessHours,enabled}',
  'false'::jsonb,
  true
)::text
WHERE config IS NOT NULL
  AND (config::jsonb) #> '{businessHours}' IS NOT NULL
  AND (config::jsonb) #> '{businessHours,enabled}' IS NULL;

-- Verify the migration
-- SELECT id, name, 
--        config::jsonb->'businessHours'->'enabled' as business_hours_enabled,
--        config::jsonb->'businessHours'->'timezone' as timezone
-- FROM chatbots
-- WHERE config IS NOT NULL
-- LIMIT 10;
