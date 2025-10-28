-- Migration: Rename systemPrompt to customInstructions in chatbot config
-- This migration updates the JSON structure within the config column

-- Update existing chatbots to rename systemPrompt to customInstructions in the behavior object
UPDATE chatbots
SET config = jsonb_set(
  config #- '{behavior,systemPrompt}',
  '{behavior,customInstructions}',
  config->'behavior'->'systemPrompt'
)
WHERE config->'behavior' ? 'systemPrompt';

-- Note: This migration only affects the JSON structure, not the table schema
-- The config column remains a JSONB type
