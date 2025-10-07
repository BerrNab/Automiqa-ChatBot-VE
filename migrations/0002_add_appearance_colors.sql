-- Migration: Add appearance color fields to chatbot configs
-- This migration updates existing chatbot configs to include the new appearance color fields

-- Update all chatbots to add the new appearance color fields if they don't exist
UPDATE chatbots
SET config = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          config,
          '{branding,chatWindowBgColor}',
          '"#FFFFFF"'::jsonb,
          true
        ),
        '{branding,userMessageBgColor}',
        COALESCE(config->'branding'->>'primaryColor', '"#3B82F6"')::jsonb,
        true
      ),
      '{branding,botMessageBgColor}',
      '"#F3F4F6"'::jsonb,
      true
    ),
    '{branding,thinkingDotsColor}',
    COALESCE(config->'branding'->>'primaryColor', '"#3B82F6"')::jsonb,
    true
  ),
  '{branding,sendButtonColor}',
  COALESCE(config->'branding'->>'primaryColor', '"#3B82F6"')::jsonb,
  true
)
WHERE config IS NOT NULL
  AND (
    config->'branding'->>'chatWindowBgColor' IS NULL
    OR config->'branding'->>'userMessageBgColor' IS NULL
    OR config->'branding'->>'botMessageBgColor' IS NULL
    OR config->'branding'->>'thinkingDotsColor' IS NULL
    OR config->'branding'->>'sendButtonColor' IS NULL
  );
