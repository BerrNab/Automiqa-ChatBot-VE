-- Migration: Make appointments optional
-- Date: 2025-10-26
-- Description: Restructures appointmentTypes to appointments.types and adds enabled flag
-- Not all chatbots need appointment booking functionality

-- Update existing chatbots to restructure appointments
UPDATE chatbots
SET config = jsonb_set(
  jsonb_set(
    COALESCE(config::jsonb, '{}'::jsonb) - 'appointmentTypes',
    '{appointments,enabled}',
    'false'::jsonb,
    true
  ),
  '{appointments,types}',
  COALESCE((config::jsonb)->'appointmentTypes', '[]'::jsonb),
  true
)::text
WHERE config IS NOT NULL
  AND (
    (config::jsonb) #> '{appointmentTypes}' IS NOT NULL
    OR (config::jsonb) #> '{appointments}' IS NULL
  );

-- Verify the migration
-- SELECT id, name, 
--        config::jsonb->'appointments'->'enabled' as appointments_enabled,
--        config::jsonb->'appointments'->'types' as appointment_types,
--        jsonb_array_length(COALESCE(config::jsonb->'appointments'->'types', '[]'::jsonb)) as types_count
-- FROM chatbots
-- WHERE config IS NOT NULL
-- LIMIT 10;
