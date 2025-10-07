import { chatbotConfigSchema, type ChatbotConfig } from "@shared/schema";

/**
 * SAFE MCP IMPLEMENTATION
 * 
 * This is a secure implementation that replaces the dangerous npx-based approach.
 * It provides mock implementations for MVP demonstration without security risks.
 * 
 * SECURITY NOTES:
 * - No external process spawning
 * - No arbitrary code execution  
 * - No credentials stored in configuration
 * - Per-chatbot isolated functionality
 * - Input validation and sanitization
 * 
 * PRODUCTION NOTES:
 * - Replace mock implementations with real integrations using Replit's integration system
 * - Use proper OAuth flows through Replit's secure integration management
 * - Implement rate limiting and proper error handling
 */

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

interface AppointmentData {
  title: string;
  dateTime: string;
  duration: number; // minutes
  description?: string;
  attendeeEmail?: string;
}

interface ClientContactData {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  timestamp: string;
}

interface MCPResult {
  success: boolean;
  data?: any;
  message: string;
  error?: string;
}

// Safe MCP tool implementations (mocked for security)
class SafeMCPManager {
  private availableTools: Record<string, MCPTool> = {
    'calendar-schedule': {
      name: 'calendar-schedule',
      description: 'Schedule appointments (demo implementation)',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', maxLength: 100 },
          dateTime: { type: 'string' },
          duration: { type: 'number', minimum: 15, maximum: 480 },
          description: { type: 'string', maxLength: 500 },
          attendeeEmail: { type: 'string', format: 'email' }
        },
        required: ['title', 'dateTime', 'duration']
      }
    },
    'calendar-availability': {
      name: 'calendar-availability',
      description: 'Check calendar availability (demo implementation)',
      inputSchema: {
        type: 'object',
        properties: {
          startDate: { type: 'string' },
          endDate: { type: 'string' }
        },
        required: ['startDate', 'endDate']
      }
    },
    'sheets-save': {
      name: 'sheets-save',
      description: 'Save client contact data (demo implementation)',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', maxLength: 100 },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', maxLength: 20 },
          company: { type: 'string', maxLength: 100 },
          notes: { type: 'string', maxLength: 1000 }
        }
      }
    }
  };

  async callTool(toolName: string, args: any, chatbotConfig: ChatbotConfig, context?: MCPContext): Promise<MCPResult> {
    try {
      // Validate chatbot configuration
      const validatedConfig = chatbotConfigSchema.parse(chatbotConfig);
      
      const tool = this.availableTools[toolName];
      if (!tool) {
        return {
          success: false,
          message: `Unknown tool: ${toolName}`,
          error: 'TOOL_NOT_FOUND'
        };
      }

      // Validate input args against schema
      this.validateToolArgs(args, tool.inputSchema);

      // Route to appropriate handler
      switch (toolName) {
        case 'calendar-schedule':
          return await this.scheduleAppointment(args, validatedConfig, context);
        case 'calendar-availability':
          return await this.checkAvailability(args, validatedConfig, context);
        case 'sheets-save':
          return await this.saveClientData(args, validatedConfig, context);
        default:
          return {
            success: false,
            message: `Tool handler not implemented: ${toolName}`,
            error: 'HANDLER_NOT_IMPLEMENTED'
          };
      }
    } catch (error: any) {
      console.error(`MCP tool error [${toolName}]:`, error);
      return {
        success: false,
        message: error.message || 'Tool execution failed',
        error: 'EXECUTION_ERROR'
      };
    }
  }

  private validateToolArgs(args: any, schema: any): void {
    if (!args || typeof args !== 'object') {
      throw new Error('Invalid arguments: must be an object');
    }

    // Basic validation (in production, use proper JSON schema validator like ajv)
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in args)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
    }

    // Validate string lengths and types
    for (const [key, value] of Object.entries(args)) {
      if (typeof value === 'string') {
        const prop = schema.properties?.[key];
        if (prop?.maxLength && value.length > prop.maxLength) {
          throw new Error(`Field ${key} exceeds maximum length of ${prop.maxLength}`);
        }
        
        // Basic XSS prevention
        if (value.includes('<script') || value.includes('javascript:')) {
          throw new Error(`Field ${key} contains potentially malicious content`);
        }
      }
    }
  }

  private async scheduleAppointment(args: AppointmentData, config: ChatbotConfig, context?: MCPContext): Promise<MCPResult> {
    // Validate calendar configuration
    if (!config.mcpTools?.googleCalendar?.enabled) {
      return {
        success: false,
        message: 'Google Calendar integration not enabled for this chatbot',
        error: 'INTEGRATION_DISABLED'
      };
    }

    // Validate date/time
    const appointmentDate = new Date(args.dateTime);
    if (isNaN(appointmentDate.getTime())) {
      return {
        success: false,
        message: 'Invalid date/time format',
        error: 'INVALID_DATETIME'
      };
    }

    if (appointmentDate < new Date()) {
      return {
        success: false,
        message: 'Cannot schedule appointments in the past',
        error: 'PAST_DATETIME'
      };
    }

    // Mock appointment scheduling (in production, integrate with real calendar API via Replit integrations)
    const appointmentId = `appt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate realistic response delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Mock success/failure (90% success rate for demo realism)
    if (Math.random() < 0.1) {
      return {
        success: false,
        message: 'Calendar conflict detected - this time slot is already booked',
        error: 'SCHEDULING_CONFLICT'
      };
    }

    return {
      success: true,
      data: {
        appointmentId,
        title: args.title,
        dateTime: args.dateTime,
        duration: args.duration,
        calendarUrl: `https://calendar.google.com/calendar/event?eid=${appointmentId}`,
        timezone: config.mcpTools.googleCalendar.timezone || 'UTC'
      },
      message: `Appointment "${args.title}" scheduled successfully for ${appointmentDate.toLocaleString()}`
    };
  }

  private async checkAvailability(args: { startDate: string; endDate: string }, config: ChatbotConfig, context?: MCPContext): Promise<MCPResult> {
    if (!config.mcpTools?.googleCalendar?.enabled) {
      return {
        success: false,
        message: 'Google Calendar integration not enabled for this chatbot',
        error: 'INTEGRATION_DISABLED'
      };
    }

    // Validate dates
    const startDate = new Date(args.startDate);
    const endDate = new Date(args.endDate);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return {
        success: false,
        message: 'Invalid date format',
        error: 'INVALID_DATE'
      };
    }

    if (endDate <= startDate) {
      return {
        success: false,
        message: 'End date must be after start date',
        error: 'INVALID_DATE_RANGE'
      };
    }

    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));

    // Generate realistic mock availability data
    const mockSlots = this.generateMockAvailability(startDate, endDate);

    return {
      success: true,
      data: {
        availableSlots: mockSlots,
        timezone: config.mcpTools.googleCalendar.timezone || 'UTC',
        dateRange: {
          start: args.startDate,
          end: args.endDate
        }
      },
      message: `Found ${mockSlots.length} available time slots`
    };
  }

  private generateMockAvailability(startDate: Date, endDate: Date) {
    const slots = [];
    const current = new Date(startDate);
    
    while (current <= endDate && slots.length < 20) {
      // Skip weekends for business hours demo
      if (current.getDay() !== 0 && current.getDay() !== 6) {
        // Generate morning and afternoon slots
        const morningSlot = new Date(current);
        morningSlot.setHours(9, 0, 0, 0);
        
        const afternoonSlot = new Date(current);
        afternoonSlot.setHours(14, 0, 0, 0);
        
        // Randomly make some slots unavailable for realism
        if (Math.random() > 0.3) {
          slots.push({
            dateTime: morningSlot.toISOString(),
            duration: 60,
            available: true
          });
        }
        
        if (Math.random() > 0.4) {
          slots.push({
            dateTime: afternoonSlot.toISOString(),
            duration: 60,
            available: true
          });
        }
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return slots;
  }

  private async saveClientData(args: Partial<ClientContactData>, config: ChatbotConfig, context?: MCPContext): Promise<MCPResult> {
    if (!config.mcpTools?.googleSheets?.enabled) {
      return {
        success: false,
        message: 'Google Sheets integration not enabled for this chatbot',
        error: 'INTEGRATION_DISABLED'
      };
    }

    // Validate required spreadsheet configuration
    if (!config.mcpTools.googleSheets.spreadsheetId) {
      return {
        success: false,
        message: 'Spreadsheet ID not configured for this chatbot',
        error: 'MISSING_CONFIGURATION'
      };
    }

    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 600));

    // Mock data saving (in production, save to real spreadsheet via Replit integrations)
    const recordId = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const clientData: ClientContactData = {
      ...args,
      timestamp: new Date().toISOString()
    };

    // Mock success with occasional failures for realism (95% success rate)
    if (Math.random() < 0.05) {
      return {
        success: false,
        message: 'Unable to save data - spreadsheet access temporarily unavailable',
        error: 'SPREADSHEET_UNAVAILABLE'
      };
    }

    return {
      success: true,
      data: {
        recordId,
        clientData,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${config.mcpTools.googleSheets.spreadsheetId}`,
        worksheet: config.mcpTools.googleSheets.worksheetName || 'Sheet1'
      },
      message: 'Contact information saved successfully'
    };
  }

  listAvailableTools(config: ChatbotConfig): MCPTool[] {
    try {
      const validatedConfig = chatbotConfigSchema.parse(config);
      const tools: MCPTool[] = [];

      if (validatedConfig.mcpTools?.googleCalendar?.enabled) {
        tools.push(this.availableTools['calendar-schedule']);
        tools.push(this.availableTools['calendar-availability']);
      }

      if (validatedConfig.mcpTools?.googleSheets?.enabled) {
        tools.push(this.availableTools['sheets-save']);
      }

      return tools;
    } catch (error) {
      console.error('Error validating config for tool list:', error);
      return [];
    }
  }
}

// Enhanced MCP service with safe implementations
// MCP Context interface for persistence
interface MCPContext {
  clientId: string;
  chatbotId: string;
  conversationId?: string;
}

export const mcpService = {
  async processMessageWithMCP(message: string, config: ChatbotConfig, context?: MCPContext): Promise<string> {
    try {
      // Validate configuration first
      const validatedConfig = chatbotConfigSchema.parse(config);
      
      if (!validatedConfig.mcpTools?.enabled) {
        // Fallback to regular OpenAI processing
        const { openaiService } = await import('./openai');
        return await openaiService.processMessage(message, validatedConfig);
      }

      // Check if message requires MCP tools
      const requiresCalendar = this.requiresCalendarTool(message);
      const requiresSheets = this.requiresSheetsTool(message);
      
      let response = "";
      
      if (requiresCalendar && validatedConfig.mcpTools.googleCalendar?.enabled) {
        response = await this.handleCalendarRequest(message, validatedConfig, context);
      } else if (requiresSheets && validatedConfig.mcpTools.googleSheets?.enabled) {
        response = await this.handleSheetsRequest(message, validatedConfig, context);
      } else {
        // Fallback to regular OpenAI processing
        const { openaiService } = await import('./openai');
        response = await openaiService.processMessage(message, validatedConfig);
      }
      
      return response;
    } catch (error: any) {
      console.error("MCP processing error:", error);
      // Don't hide errors - return informative message
      return `I encountered an error processing your request: ${error.message}. Please try again or contact support if the issue persists.`;
    }
  },

  requiresCalendarTool(message: string): boolean {
    const calendarKeywords = ['schedule', 'appointment', 'meeting', 'calendar', 'book', 'availability', 'time slot', 'when are you free', 'when can we meet'];
    return calendarKeywords.some(keyword => message.toLowerCase().includes(keyword));
  },

  requiresSheetsTool(message: string): boolean {
    const sheetsKeywords = ['save my information', 'store my details', 'record my data', 'save my contact', 'keep my info', 'remember my details'];
    return sheetsKeywords.some(keyword => message.toLowerCase().includes(keyword));
  },

  async handleCalendarRequest(message: string, config: ChatbotConfig, context?: MCPContext): Promise<string> {
    try {
      // Parse the request and determine the appropriate calendar action
      if (message.toLowerCase().includes('schedule') || message.toLowerCase().includes('book')) {
        return await this.scheduleAppointment(message, config, context);
      } else if (message.toLowerCase().includes('availability') || message.toLowerCase().includes('free')) {
        return await this.checkAvailability(message, config, context);
      } else {
        return "I can help you schedule appointments or check availability. What would you like to do?";
      }
    } catch (error: any) {
      console.error("Calendar request error:", error);
      return `I encountered an error with the calendar integration: ${error.message}. Please try again.`;
    }
  },

  async handleSheetsRequest(message: string, config: ChatbotConfig, context?: MCPContext): Promise<string> {
    try {
      // Extract information from message and save to sheets
      const clientInfo = this.extractClientInfo(message);
      const result = await safeMcpManager.callTool('sheets-save', clientInfo, config);
      
      if (result.success) {
        // Persist lead data to database
        if (context?.clientId && context?.chatbotId && clientInfo.name && clientInfo.email) {
          try {
            const { storage } = await import('../storage-supabase');
            await storage.createLead({
              clientId: context.clientId,
              chatbotId: context.chatbotId,
              name: clientInfo.name,
              email: clientInfo.email,
              phone: clientInfo.phone || null,
              notes: clientInfo.notes || null,
              source: 'chat_widget',
              status: 'new'
            });
            console.log(`Lead data persisted for client ${context.clientId}`);
          } catch (dbError: any) {
            console.error(`Lead persistence error for client ${context.clientId}:`, dbError);
            // Continue processing - don't break chat flow
          }
        }
        return result.message + " Is there anything else I can help you with?";
      } else {
        return `I had trouble saving your information: ${result.message}. Please try again.`;
      }
    } catch (error: any) {
      console.error("Sheets request error:", error);
      return `I encountered an error saving your information: ${error.message}. Please try again.`;
    }
  },

  async scheduleAppointment(message: string, config: ChatbotConfig, context?: MCPContext): Promise<string> {
    try {
      // Extract appointment details from message (basic implementation)
      const appointmentDetails = this.parseAppointmentRequest(message);
      
      const result = await safeMcpManager.callTool('calendar-schedule', appointmentDetails, config, context);
      
      if (result.success) {
        // Persist appointment data to database
        if (context?.clientId && context?.chatbotId && result.data) {
          try {
            const { storage } = await import('../storage-supabase');
            const startTime = new Date(appointmentDetails.dateTime);
            const endTime = new Date(startTime.getTime() + appointmentDetails.duration * 60000); // Add duration in milliseconds
            
            await storage.createAppointment({
              clientId: context.clientId,
              chatbotId: context.chatbotId,
              title: appointmentDetails.title,
              startTime: startTime,
              endTime: endTime,
              description: appointmentDetails.description || null,
              status: 'scheduled'
            });
            console.log(`Appointment persisted for client ${context.clientId}`);
          } catch (dbError: any) {
            console.error(`Appointment persistence error for client ${context.clientId}:`, dbError);
            // Continue processing - don't break chat flow
          }
        }
        return result.message;
      } else {
        return `I had trouble scheduling that appointment: ${result.message}. Could you please provide more specific details like the date and time?`;
      }
    } catch (error: any) {
      console.error("Appointment scheduling error:", error);
      return `I encountered an error scheduling your appointment: ${error.message}. Please try again with more specific details.`;
    }
  },

  async checkAvailability(message: string, config: ChatbotConfig, context?: MCPContext): Promise<string> {
    try {
      // Default to checking next 7 days
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);
      
      const result = await safeMcpManager.callTool('calendar-availability', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }, config, context);

      if (result.success) {
        const slots = result.data.availableSlots;
        if (slots.length > 0) {
          const firstFew = slots.slice(0, 3);
          const timeSlots = firstFew.map((slot: any) => 
            new Date(slot.dateTime).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short', 
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })
          ).join(', ');
          
          return `I have availability on: ${timeSlots}${slots.length > 3 ? ` and ${slots.length - 3} more slots` : ''}. Which time works best for you?`;
        } else {
          return "I don't have any availability in the next week. Would you like me to check a different time period?";
        }
      } else {
        return `I'm unable to check availability right now: ${result.message}. Please try again later.`;
      }
    } catch (error: any) {
      console.error("Availability check error:", error);
      return `I encountered an error checking availability: ${error.message}. Please try again.`;
    }
  },

  parseAppointmentRequest(message: string): AppointmentData {
    // Simple parsing - in production, use more sophisticated NLP or AI extraction
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0); // Default to 2 PM tomorrow
    
    return {
      title: "Client Appointment",
      dateTime: tomorrow.toISOString(),
      duration: 60, // Default 1 hour
      description: "Appointment scheduled via chatbot"
    };
  },

  extractClientInfo(message: string): Partial<ClientContactData> {
    // Basic extraction - in production, use NLP or AI to extract structured data
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/;
    
    const email = message.match(emailRegex)?.[0];
    const phone = message.match(phoneRegex)?.[0];
    
    return {
      email,
      phone,
      notes: message,
      timestamp: new Date().toISOString()
    };
  }
};

// Export the safe MCP manager
export const safeMcpManager = new SafeMCPManager();

// For backwards compatibility, export as mcpManager but log deprecation warning
export const mcpManager = {
  ...safeMcpManager,
  hasServer: () => {
    console.warn('DEPRECATED: mcpManager.hasServer() is deprecated. Use safeMcpManager instead.');
    return false;
  }
};