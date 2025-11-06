import { 
  pluginTemplateService, 
  chatbotPluginService, 
  pluginExecutionLogService,
  chatbotService,
  conversationService,
  messageService
} from '../database/index.js';
import { 
  PluginTemplate, 
  ChatbotPlugin, 
  PluginExecutionLog,
  InsertPluginTemplate,
  InsertChatbotPlugin,
  InsertPluginExecutionLog,
  TriggerRules,
  ChatbotPluginWithTemplate,
  PluginExecutionLogWithDetails
} from '../shared/schema.js';
import { nanoid } from 'nanoid';

export interface PluginExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime?: number;
}

export interface ConversationData {
  userMessage: string;
  conversationHistory: Array<{role: string; content: string; timestamp: string}>;
  extractedData: Record<string, any>;
  chatbotConfig: Record<string, any>;
}

export class PluginManagerService {
  
  // Plugin Template Management (Admin)
  
  async createPluginTemplate(
    templateData: InsertPluginTemplate, 
    createdBy: string
  ): Promise<PluginTemplate> {
    try {
      const {
        apiConfiguration,
        configSchema,
        inputSchema,
        outputSchema,
        documentationUrl,
        isActive,
        isPublic,
        ...rest
      } = templateData;

      const template = await pluginTemplateService.create({
        ...rest,
        api_configuration: apiConfiguration,
        config_schema: configSchema,
        input_schema: inputSchema,
        output_schema: outputSchema,
        documentation_url: documentationUrl,
        is_active: isActive,
        is_public: isPublic,
        id: nanoid(),
        created_by: createdBy,
        created_at: new Date(),
        updated_at: new Date()
      });
      return template as PluginTemplate;
    } catch (error) {
      console.error('Error creating plugin template:', error);
      throw new Error(`Failed to create plugin template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updatePluginTemplate(
    id: string, 
    updateData: Partial<InsertPluginTemplate>
  ): Promise<PluginTemplate> {
    try {
      const {
        isActive,
        isPublic,
        apiConfiguration,
        configSchema,
        inputSchema,
        outputSchema,
        documentationUrl,
        ...rest
      } = updateData;

      const template = await pluginTemplateService.update(id, {
        ...rest,
        is_active: isActive,
        is_public: isPublic,
        api_configuration: apiConfiguration,
        config_schema: configSchema,
        input_schema: inputSchema,
        output_schema: outputSchema,
        documentation_url: documentationUrl,
        updated_at: new Date()
      });
      return template as PluginTemplate;
    } catch (error) {
      console.error('Error updating plugin template:', error);
      throw new Error(`Failed to update plugin template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deletePluginTemplate(id: string): Promise<void> {
    try {
      // Check if plugin is in use by any chatbot
      const activePlugins = await chatbotPluginService.query({
        pluginTemplateId: id,
        isEnabled: true
      });
      
      if (activePlugins.length > 0) {
        throw new Error('Cannot delete plugin template: it is actively used by chatbots');
      }

      await pluginTemplateService.delete(id);
    } catch (error) {
      console.error('Error deleting plugin template:', error);
      throw new Error(`Failed to delete plugin template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPluginTemplates(filters: {
    type?: string;
    category?: string;
    isActive?: boolean;
    isPublic?: boolean;
  } = {}): Promise<PluginTemplate[]> {
    try {
      const templates = await pluginTemplateService.query(filters, {
        orderBy: 'created_at',
        orderDirection: 'desc'
      });
      return templates as PluginTemplate[];
    } catch (error) {
      console.error('Error fetching plugin templates:', error);
      throw new Error(`Failed to fetch plugin templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPluginTemplateById(id: string): Promise<PluginTemplate | null> {
    try {
      const template = await pluginTemplateService.getById(id);
      return template as PluginTemplate | null;
    } catch (error) {
      console.error('Error fetching plugin template:', error);
      throw new Error(`Failed to fetch plugin template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Chatbot Plugin Management (Client)
  
  async addPluginToChatbot(
    pluginData: InsertChatbotPlugin,
    configuredBy: string
  ): Promise<ChatbotPlugin> {
    try {
      // Validate that chatbot exists
      const chatbot = await chatbotService.getById(pluginData.chatbot_id);
      if (!chatbot) {
        throw new Error('Chatbot not found');
      }

      // Validate that plugin template exists and is public
      const template = await pluginTemplateService.getById(pluginData.plugin_template_id);
      if (!template) {
        throw new Error('Plugin template not found');
      }
      if (!(template as PluginTemplate).isPublic) {
        throw new Error('Plugin template is not available for use');
      }

      const {
        chatbot_id,
        plugin_template_id,
        is_enabled,
        trigger_rules,
        settings,
        ...rest
      } = pluginData;

      const plugin = await chatbotPluginService.create({
        ...rest,
        chatbot_id: chatbot_id,
        plugin_template_id: plugin_template_id,
        is_enabled: is_enabled,
        trigger_rules: trigger_rules,
        settings: settings,
        id: nanoid(),
        configured_by: configuredBy,
        created_at: new Date(),
        updated_at: new Date()
      });
      return plugin as ChatbotPlugin;
    } catch (error) {
      console.error('Error adding plugin to chatbot:', error);
      throw new Error(`Failed to add plugin to chatbot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateChatbotPlugin(
    id: string, 
    updateData: Partial<InsertChatbotPlugin>
  ): Promise<ChatbotPlugin> {
    try {
      const plugin = await chatbotPluginService.update(id, {
        ...updateData,
        updatedAt: new Date()
      });
      return plugin as ChatbotPlugin;
    } catch (error) {
      console.error('Error updating chatbot plugin:', error);
      throw new Error(`Failed to update chatbot plugin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async removePluginFromChatbot(id: string): Promise<void> {
    try {
      await chatbotPluginService.delete(id);
    } catch (error) {
      console.error('Error removing plugin from chatbot:', error);
      throw new Error(`Failed to remove plugin from chatbot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getChatbotPlugins(chatbotId: string): Promise<ChatbotPluginWithTemplate[]> {
    try {
      const plugins = await chatbotPluginService.query({ chatbot_id: chatbotId });
      
      // Enrich with template and chatbot data
      const enrichedPlugins: ChatbotPluginWithTemplate[] = [];
      for (const plugin of plugins) {
        const template = await pluginTemplateService.getById(plugin.plugin_template_id);
        const chatbot = await chatbotService.getById(plugin.chatbot_id);
        
        if (template && chatbot) {
          enrichedPlugins.push({
            ...plugin,
            pluginTemplate: template as PluginTemplate,
            chatbot: chatbot
          });
        }
      }
      
      return enrichedPlugins;
    } catch (error) {
      console.error('Error fetching chatbot plugins:', error);
      throw new Error(`Failed to fetch chatbot plugins: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getEnabledPluginsForChatbot(chatbotId: string): Promise<ChatbotPluginWithTemplate[]> {
    try {
      const plugins = await this.getChatbotPlugins(chatbotId);
      return plugins.filter(plugin => plugin.is_enabled);
    } catch (error) {
      console.error('Error fetching enabled plugins:', error);
      throw new Error(`Failed to fetch enabled plugins: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Plugin Execution
  
  async executePlugin(
    pluginId: string, 
    conversationData: ConversationData,
    conversationId?: string
  ): Promise<PluginExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Get plugin details
      const plugin = await chatbotPluginService.getById(pluginId);
      if (!plugin) {
        throw new Error('Plugin not found');
      }

      if (!plugin.is_enabled) {
        throw new Error('Plugin is not enabled');
      }

      const template = await pluginTemplateService.getById(plugin.plugin_template_id);
      if (!template) {
        throw new Error('Plugin template not found');
      }

      // Create execution log
      const executionLog = await pluginExecutionLogService.create({
        id: nanoid(),
        chatbot_plugin_id: pluginId,
        conversation_id: conversationId || null,
        input_data: conversationData,
        output_data: {},
        status: 'pending',
        started_at: new Date(),
        metadata: {}
      } as InsertPluginExecutionLog);

      // Execute plugin based on type
      let result: PluginExecutionResult;
      
      switch ((template as PluginTemplate).type) {
        case 'n8n':
          result = await this.executeN8nPlugin(plugin as ChatbotPlugin, template as PluginTemplate, conversationData);
          break;
        case 'webhook':
          result = await this.executeWebhookPlugin(plugin as ChatbotPlugin, template as PluginTemplate, conversationData);
          break;
        case 'api':
          result = await this.executeApiPlugin(plugin as ChatbotPlugin, template as PluginTemplate, conversationData);
          break;
        default:
          throw new Error(`Unsupported plugin type: ${(template as PluginTemplate).type}`);
      }

      const executionTime = Date.now() - startTime;

      // Update execution log
      await pluginExecutionLogService.update(executionLog.id, {
        outputData: result.data || {},
        status: result.success ? 'success' : 'error',
        errorMessage: result.error || null,
        completedAt: new Date(),
        executionDurationMs: executionTime
      });

      // Update plugin usage count
      await chatbotPluginService.update(pluginId, {
        usageCount: (plugin as ChatbotPlugin).usageCount + 1,
        lastUsedAt: new Date()
      });

      return {
        ...result,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('Error executing plugin:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime
      };
    }
  }

  private async executeN8nPlugin(
    plugin: ChatbotPlugin, 
    template: PluginTemplate, 
    conversationData: ConversationData
  ): Promise<PluginExecutionResult> {
    try {
      const config = plugin.config;
      const webhookUrl = config.webhook_url;
      
      if (!webhookUrl) {
        throw new Error('Webhook URL not configured');
      }

      // Prepare request headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'SaaSOps-Chatbot-Plugin/1.0'
      };

      // Add authentication if configured
      if (config.authentication?.type === 'bearer' && config.authentication.token) {
        headers['Authorization'] = `Bearer ${config.authentication.token}`;
      } else if (config.authentication?.type === 'basic') {
        const auth = Buffer.from(`${config.authentication.username}:${config.authentication.password}`).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
      }

      // Make webhook call
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(conversationData),
        signal: AbortSignal.timeout(config.timeout || 10000)
      });

      if (!response.ok) {
        throw new Error(`Webhook call failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async executeWebhookPlugin(
    plugin: ChatbotPlugin, 
    template: PluginTemplate, 
    conversationData: ConversationData
  ): Promise<PluginExecutionResult> {
    // Similar to n8n plugin but with generic webhook handling
    return this.executeN8nPlugin(plugin, template, conversationData);
  }

  private async executeApiPlugin(
    plugin: ChatbotPlugin, 
    template: PluginTemplate, 
    conversationData: ConversationData
  ): Promise<PluginExecutionResult> {
    // Custom API execution logic can be implemented here
    // For now, delegate to webhook execution
    return this.executeN8nPlugin(plugin, template, conversationData);
  }

  // Trigger Rules Evaluation
  
  async evaluateTriggerRules(
    pluginId: string, 
    conversationData: ConversationData
  ): Promise<boolean> {
    try {
      const plugin = await chatbotPluginService.getById(pluginId);
      if (!plugin || !plugin.isEnabled) {
        return false;
      }

      const triggerRules = plugin.triggerRules as TriggerRules;
      
      // Check keyword triggers
      if (triggerRules.keywords && triggerRules.keywords.length > 0) {
        const messageText = conversationData.userMessage.toLowerCase();
        const hasKeyword = triggerRules.keywords.some(keyword => 
          messageText.includes(keyword.toLowerCase())
        );
        if (!hasKeyword) {
          return false;
        }
      }

      // Check message count trigger
      if (triggerRules.messageCount) {
        const messageCount = conversationData.conversationHistory.length;
        if (messageCount < triggerRules.messageCount) {
          return false;
        }
      }

      // Check conversation patterns
      if (triggerRules.conversationPatterns) {
        const patterns = triggerRules.conversationPatterns;
        
        if (patterns.containsEmail) {
          const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
          if (!emailRegex.test(conversationData.userMessage)) {
            return false;
          }
        }

        if (patterns.containsPhone) {
          const phoneRegex = /(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/;
          if (!phoneRegex.test(conversationData.userMessage)) {
            return false;
          }
        }

        if (patterns.minMessageLength) {
          if (conversationData.userMessage.length < patterns.minMessageLength) {
            return false;
          }
        }

        if (patterns.maxMessageLength) {
          if (conversationData.userMessage.length > patterns.maxMessageLength) {
            return false;
          }
        }
      }

      // Check time conditions
      if (triggerRules.timeConditions?.businessHoursOnly) {
        const now = new Date();
        const day = now.getDay();
        const hour = now.getHours();
        
        // Basic business hours check (Monday-Friday, 9 AM - 5 PM)
        if (day === 0 || day === 6 || hour < 9 || hour >= 17) {
          return false;
        }
      }

      return true;

    } catch (error) {
      console.error('Error evaluating trigger rules:', error);
      return false;
    }
  }

  // Plugin Execution Logs
  
  async getPluginExecutionLogs(
    chatbotPluginId?: string,
    conversationId?: string,
    limit: number = 50
  ): Promise<PluginExecutionLogWithDetails[]> {
    try {
      const filters: Record<string, any> = {};
      if (chatbotPluginId) filters.chatbot_plugin_id = chatbotPluginId;
      if (conversationId) filters.conversation_id = conversationId;

      const logs = await pluginExecutionLogService.query(filters, {
        orderBy: 'started_at',
        orderDirection: 'desc',
        limit
      });

      // Enrich with plugin and conversation data
      const enrichedLogs: PluginExecutionLogWithDetails[] = [];
      for (const log of logs) {
        const chatbotPlugin = await chatbotPluginService.getById(log.chatbot_plugin_id);
        let conversation = null;
        
        if (log.conversation_id) {
          conversation = await conversationService.getById(log.conversation_id);
        }

        if (chatbotPlugin) {
          const template = await pluginTemplateService.getById(chatbotPlugin.plugin_template_id);
          const chatbot = await chatbotService.getById(chatbotPlugin.chatbot_id);
          
          if (template && chatbot) {
            enrichedLogs.push({
              ...log,
              chatbotPlugin: {
                ...chatbotPlugin,
                pluginTemplate: template as PluginTemplate,
                chatbot: chatbot
              },
              conversation
            });
          }
        }
      }

      return enrichedLogs;
    } catch (error) {
      console.error('Error fetching plugin execution logs:', error);
      throw new Error(`Failed to fetch plugin execution logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Analytics and Usage
  
  async getPluginUsageStats(pluginTemplateId: string): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    activeInstances: number;
  }> {
    try {
      // Get all chatbot plugins using this template
      const chatbotPlugins = await chatbotPluginService.query({
        plugin_template_id: pluginTemplateId
      });

      const activeInstances = chatbotPlugins.filter(p => p.is_enabled).length;

      // Get execution logs for all plugins using this template
      const pluginIds = chatbotPlugins.map(p => p.id);
      const allLogs: PluginExecutionLog[] = [];
      
      for (const pluginId of pluginIds) {
        const logs = await pluginExecutionLogService.query({
          chatbot_plugin_id: pluginId
        });
        allLogs.push(...logs as PluginExecutionLog[]);
      }

      const totalExecutions = allLogs.length;
      const successfulExecutions = allLogs.filter(l => l.status === 'success').length;
      const failedExecutions = allLogs.filter(l => l.status === 'error').length;
      
      const completedLogs = allLogs.filter(l => l.executionDurationMs !== null);
      const averageExecutionTime = completedLogs.length > 0 
        ? completedLogs.reduce((sum, log) => sum + (log.executionDurationMs || 0), 0) / completedLogs.length
        : 0;

      return {
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        averageExecutionTime,
        activeInstances
      };
    } catch (error) {
      console.error('Error getting plugin usage stats:', error);
      throw new Error(`Failed to get plugin usage stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const pluginManagerService = new PluginManagerService();
