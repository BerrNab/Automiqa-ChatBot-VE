-- Migration: Add language and RTL support to chatbot widget settings
-- Date: 2025-10-26
-- Description: Adds enableLanguageSwitcher, supportedLanguages, and defaultLanguage fields to widget settings

-- Note: This migration updates the JSONB config column
-- The schema changes are already defined in shared/schema.ts
-- This migration ensures existing chatbots have the default values

-- Update existing chatbots to include default language settings
UPDATE chatbots
SET config = jsonb_set(
  jsonb_set(
    jsonb_set(
      COALESCE(config::jsonb, '{}'::jsonb),
      '{widgetSettings,enableLanguageSwitcher}',
      'false'::jsonb,
      true
    ),
    '{widgetSettings,supportedLanguages}',
    '[{"code": "fr", "name": "Français", "rtl": false}]'::jsonb,
    true
  ),
  '{widgetSettings,defaultLanguage}',
  '"fr"'::jsonb,
  true
)::text
WHERE config IS NOT NULL
  AND (
    (config::jsonb) #> '{widgetSettings,enableLanguageSwitcher}' IS NULL
    OR (config::jsonb) #> '{widgetSettings,supportedLanguages}' IS NULL
    OR (config::jsonb) #> '{widgetSettings,defaultLanguage}' IS NULL
  );

-- Verify the migration
-- SELECT id, name, config->'widgetSettings'->'enableLanguageSwitcher' as enable_lang_switcher,
--        config->'widgetSettings'->'supportedLanguages' as supported_langs,
--        config->'widgetSettings'->'defaultLanguage' as default_lang
-- FROM chatbots
-- LIMIT 5;
