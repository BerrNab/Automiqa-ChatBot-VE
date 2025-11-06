-- Plugin Manager Database Schema Migration
-- Adds tables for managing plugins that chatbots can use

-- Plugin templates table - stores plugin definitions created by admin
CREATE TABLE IF NOT EXISTS plugin_templates (
    id VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100) NOT NULL, -- n8n, webhook, api, custom, etc.
    version VARCHAR(50) DEFAULT '1.0.0',
    
    -- Plugin configuration schema (JSON Schema for validation)
    config_schema JSONB NOT NULL DEFAULT '{}',
    
    -- Input JSON schema that will be automatically populated from conversations
    input_schema JSONB NOT NULL DEFAULT '{}',
    
    -- Required parameters for plugin execution (URL, API keys, etc.)
    required_params JSONB NOT NULL DEFAULT '{}',
    
    -- Plugin execution configuration
    execution_config JSONB NOT NULL DEFAULT '{}',
    
    -- Plugin metadata
    category VARCHAR(100) DEFAULT 'general',
    tags TEXT[] DEFAULT '{}',
    documentation_url TEXT,
    
    -- Status and controls
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT true, -- Whether clients can see this plugin
    
    -- Audit fields
    created_by VARCHAR REFERENCES admins(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Chatbot plugin instances table - stores client-specific plugin configurations
CREATE TABLE IF NOT EXISTS chatbot_plugins (
    id VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
    chatbot_id VARCHAR REFERENCES chatbots(id) ON DELETE CASCADE NOT NULL,
    plugin_template_id VARCHAR REFERENCES plugin_templates(id) ON DELETE CASCADE NOT NULL,
    
    -- Client-specific plugin configuration (excluding input data)
    config JSONB NOT NULL DEFAULT '{}',
    
    -- Plugin activation status
    is_enabled BOOLEAN DEFAULT false,
    
    -- Trigger rules for when this plugin should be activated
    trigger_rules JSONB NOT NULL DEFAULT '{}',
    
    -- Plugin-specific settings
    settings JSONB NOT NULL DEFAULT '{}',
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    configured_by VARCHAR REFERENCES clients(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Ensure unique plugin per chatbot
    UNIQUE(chatbot_id, plugin_template_id)
);

-- Plugin execution logs table - tracks plugin executions and results
CREATE TABLE IF NOT EXISTS plugin_execution_logs (
    id VARCHAR DEFAULT gen_random_uuid() PRIMARY KEY,
    chatbot_plugin_id VARCHAR REFERENCES chatbot_plugins(id) ON DELETE CASCADE NOT NULL,
    conversation_id VARCHAR REFERENCES conversations(id) ON DELETE CASCADE,
    
    -- Execution details
    status VARCHAR(50) NOT NULL, -- 'pending', 'success', 'error', 'timeout'
    execution_time_ms INTEGER,
    
    -- Input and output data
    input_data JSONB NOT NULL DEFAULT '{}',
    output_data JSONB NOT NULL DEFAULT '{}',
    error_message TEXT,
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for plugin_templates
CREATE INDEX IF NOT EXISTS plugin_templates_type_idx ON plugin_templates (type);
CREATE INDEX IF NOT EXISTS plugin_templates_category_idx ON plugin_templates (category);
CREATE INDEX IF NOT EXISTS plugin_templates_is_active_idx ON plugin_templates (is_active);
CREATE INDEX IF NOT EXISTS plugin_templates_is_public_idx ON plugin_templates (is_public);
CREATE INDEX IF NOT EXISTS plugin_templates_created_at_idx ON plugin_templates (created_at);

-- Create indexes for chatbot_plugins
CREATE INDEX IF NOT EXISTS chatbot_plugins_chatbot_id_idx ON chatbot_plugins (chatbot_id);
CREATE INDEX IF NOT EXISTS chatbot_plugins_plugin_template_id_idx ON chatbot_plugins (plugin_template_id);
CREATE INDEX IF NOT EXISTS chatbot_plugins_is_enabled_idx ON chatbot_plugins (is_enabled);
CREATE INDEX IF NOT EXISTS chatbot_plugins_created_at_idx ON chatbot_plugins (created_at);

-- Create indexes for plugin_execution_logs
CREATE INDEX IF NOT EXISTS plugin_execution_logs_chatbot_plugin_id_idx ON plugin_execution_logs (chatbot_plugin_id);
CREATE INDEX IF NOT EXISTS plugin_execution_logs_conversation_id_idx ON plugin_execution_logs (conversation_id);
CREATE INDEX IF NOT EXISTS plugin_execution_logs_status_idx ON plugin_execution_logs (status);
CREATE INDEX IF NOT EXISTS plugin_execution_logs_started_at_idx ON plugin_execution_logs (started_at);

-- Create trigger to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE OR REPLACE TRIGGER update_plugin_templates_updated_at 
    BEFORE UPDATE ON plugin_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_chatbot_plugins_updated_at 
    BEFORE UPDATE ON chatbot_plugins 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample n8n plugin template
INSERT INTO plugin_templates (
    name, 
    description, 
    type, 
    config_schema,
    input_schema,
    required_params,
    execution_config,
    category,
    tags
) VALUES (
    'n8n Webhook Plugin',
    'Execute n8n workflows via webhook calls with dynamic input from conversations',
    'n8n',
    '{
        "type": "object",
        "properties": {
            "webhook_url": {
                "type": "string",
                "format": "uri",
                "title": "Webhook URL",
                "description": "The n8n webhook URL to trigger"
            },
            "authentication": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": ["none", "bearer", "basic"],
                        "title": "Authentication Type"
                    },
                    "token": {
                        "type": "string",
                        "title": "Bearer Token"
                    },
                    "username": {
                        "type": "string",
                        "title": "Username"
                    },
                    "password": {
                        "type": "string",
                        "title": "Password"
                    }
                }
            },
            "timeout": {
                "type": "integer",
                "minimum": 1000,
                "maximum": 30000,
                "default": 10000,
                "title": "Timeout (ms)"
            }
        },
        "required": ["webhook_url"]
    }',
    '{
        "type": "object",
        "properties": {
            "user_message": {
                "type": "string",
                "title": "User Message",
                "description": "The current user message that triggered the plugin"
            },
            "conversation_context": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "role": {"type": "string"},
                        "content": {"type": "string"},
                        "timestamp": {"type": "string"}
                    }
                },
                "title": "Conversation Context"
            },
            "extracted_data": {
                "type": "object",
                "title": "Extracted Data",
                "description": "Data extracted from conversation based on input schema"
            },
            "chatbot_config": {
                "type": "object",
                "title": "Chatbot Configuration",
                "description": "Current chatbot configuration"
            }
        },
        "required": ["user_message"]
    }',
    '{
        "webhook_url": {
            "type": "url",
            "required": true,
            "label": "n8n Webhook URL",
            "placeholder": "https://your-n8n-instance.com/webhook/..."
        },
        "authentication": {
            "type": "auth",
            "required": false,
            "label": "Authentication",
            "options": ["none", "bearer", "basic"]
        },
        "timeout": {
            "type": "number",
            "required": false,
            "label": "Request Timeout (ms)",
            "default": 10000,
            "min": 1000,
            "max": 30000
        }
    }',
    '{
        "method": "POST",
        "headers": {
            "Content-Type": "application/json",
            "User-Agent": "SaaSOps-Chatbot-Plugin/1.0"
        },
        "retry_attempts": 3,
        "retry_delay": 1000
    }',
    'integration',
    ARRAY['n8n', 'webhook', 'automation', 'workflow']
) ON CONFLICT DO NOTHING;

-- Insert sample trigger rule examples
COMMENT ON COLUMN chatbot_plugins.trigger_rules IS 'JSON configuration for when to trigger the plugin. Example: {
    "keywords": ["contact", "lead", "information"],
    "message_count": 3,
    "user_intent": "data_collection",
    "time_conditions": {
        "business_hours_only": true
    },
    "conversation_patterns": {
        "contains_email": true,
        "contains_phone": false
    }
}';

-- Create view for active plugins with their templates
CREATE OR REPLACE VIEW active_chatbot_plugins AS
SELECT 
    cp.id as chatbot_plugin_id,
    cp.chatbot_id,
    cp.plugin_template_id,
    cp.config,
    cp.is_enabled,
    cp.trigger_rules,
    cp.settings,
    cp.usage_count,
    cp.last_used_at,
    pt.name as plugin_name,
    pt.description as plugin_description,
    pt.type as plugin_type,
    pt.category,
    pt.tags,
    c.name as chatbot_name,
    cl.name as client_name
FROM chatbot_plugins cp
JOIN plugin_templates pt ON cp.plugin_template_id = pt.id
JOIN chatbots c ON cp.chatbot_id = c.id
JOIN clients cl ON c.client_id = cl.id
WHERE cp.is_enabled = true AND pt.is_active = true;
