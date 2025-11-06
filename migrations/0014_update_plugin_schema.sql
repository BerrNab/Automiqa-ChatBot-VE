-- Update plugin templates table to support API-based plugins
-- Remove old fields and add new API-specific fields

-- Drop dependent views first
DROP VIEW IF EXISTS active_chatbot_plugins CASCADE;

-- Add new columns first
ALTER TABLE plugin_templates 
ADD COLUMN IF NOT EXISTS api_configuration JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS output_schema JSONB DEFAULT '{}';

-- Update existing records to have default values
UPDATE plugin_templates 
SET api_configuration = '{"url": "", "method": "GET", "headers": {}}'::jsonb,
    output_schema = '{"type": "object", "properties": {}}'::jsonb
WHERE api_configuration IS NULL OR output_schema IS NULL;

-- Drop old columns that are no longer needed
ALTER TABLE plugin_templates 
DROP COLUMN IF EXISTS type,
DROP COLUMN IF EXISTS required_params,
DROP COLUMN IF EXISTS execution_config;

-- Recreate the view without the type column
CREATE OR REPLACE VIEW active_chatbot_plugins AS
SELECT 
    cp.id,
    cp.chatbot_id,
    cp.plugin_template_id,
    cp.config,
    cp.is_enabled,
    cp.trigger_rules,
    cp.settings,
    cp.created_at,
    cp.updated_at,
    pt.name as template_name,
    pt.description as template_description,
    pt.category,
    pt.tags,
    pt.documentation_url,
    pt.config_schema,
    pt.api_configuration,
    pt.input_schema,
    pt.output_schema,
    pt.is_active as template_is_active,
    pt.is_public as template_is_public
FROM chatbot_plugins cp
JOIN plugin_templates pt ON cp.plugin_template_id = pt.id
WHERE cp.is_enabled = true AND pt.is_active = true;

-- Add comments for documentation
COMMENT ON COLUMN plugin_templates.config_schema IS 'JSON schema for plugin configuration properties (API keys, URLs, etc.)';
COMMENT ON COLUMN plugin_templates.api_configuration IS 'API call configuration with URL, method, headers that can reference config properties';
COMMENT ON COLUMN plugin_templates.input_schema IS 'JSON schema for request body data sent to API';
COMMENT ON COLUMN plugin_templates.output_schema IS 'JSON schema for expected API response structure';
