-- Migration: Ensure valid chatbot config JSON
-- This migration adds a trigger to ensure the config field is always stored as a valid JSON object

-- Create a function to validate and normalize JSON
CREATE OR REPLACE FUNCTION normalize_chatbot_config()
RETURNS TRIGGER AS $$
BEGIN
  -- If config is NULL, set it to an empty object
  IF NEW.config IS NULL THEN
    NEW.config = '{}'::jsonb;
  END IF;
  
  -- If config is a string, try to parse it as JSON
  IF pg_typeof(NEW.config) = 'text'::regtype THEN
    BEGIN
      NEW.config = NEW.config::jsonb;
    EXCEPTION WHEN OTHERS THEN
      -- If parsing fails, set to empty object
      NEW.config = '{}'::jsonb;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to run before insert or update
DROP TRIGGER IF EXISTS ensure_valid_chatbot_config ON chatbots;
CREATE TRIGGER ensure_valid_chatbot_config
BEFORE INSERT OR UPDATE ON chatbots
FOR EACH ROW
EXECUTE FUNCTION normalize_chatbot_config();

-- Comment explaining the migration
COMMENT ON FUNCTION normalize_chatbot_config() IS 'Ensures chatbot config is always stored as valid JSON';
