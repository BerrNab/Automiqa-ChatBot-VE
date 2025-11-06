import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, uniqueIndex, index, customType } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { nanoid } from "nanoid";

// Default custom instructions for chatbot (user-configurable domain-specific guidance)
const DEFAULT_CUSTOM_INSTRUCTIONS = `You are a helpful assistant chatbot. Your primary role is to assist users with their questions and provide helpful information based on the available knowledge base and tools.

When users ask questions:
- Provide clear, accurate, and helpful responses
- Use the knowledge base and available tools to find relevant information
- If you don't have the information, politely let them know and offer to help with something else
- Stay focused on helping users with their queries
- Be professional and courteous in all interactions`;

// Chatbot configuration schemas with proper validation
export const chatbotConfigSchema = z.object({
  // Branding configuration
  branding: z.object({
    primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color").default("#3B82F6"),
    secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color").default("#10B981"),
    logoUrl: z.string().url("Must be a valid URL").optional(), // URL for logo stored in Supabase
    backgroundImageUrl: z.string().url("Must be a valid URL").optional(), // URL for background image stored in Supabase
    companyName: z.string().min(1, "Company name is required").max(100, "Company name too long").optional(),
    // Appearance colors for chat interface
    chatWindowBgColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color").default("#FFFFFF"),
    userMessageBgColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color").optional(),
    botMessageBgColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color").default("#F3F4F6"),
    thinkingDotsColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color").optional(),
    sendButtonColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color").optional(),
  }).default({
    primaryColor: "#3B82F6",
    secondaryColor: "#10B981",
    chatWindowBgColor: "#FFFFFF",
    botMessageBgColor: "#F3F4F6",
  }),
  
  // Behavior and personality configuration
  behavior: z.object({
    welcomeMessage: z.string()
      .min(1, "Welcome message cannot be empty")
      .max(500, "Welcome message too long")
      .default("Hello! Welcome to our service. How can I help you today?"),
    suggestedPrompts: z.array(
      z.string().min(1, "Prompt cannot be empty").max(100, "Prompt too long")
    ).max(5, "Maximum 5 suggested prompts allowed").default([
      "What services do you offer?",
      "How can I book an appointment?",
      "What are your business hours?",
      "Tell me about pricing",
    ]),
    fallbackMessage: z.string()
      .min(1, "Fallback message cannot be empty")
      .max(500, "Fallback message too long")
      .default("Apologies, I do not have that information. Please contact our support team for further assistance."),
    aiPersonality: z.union([
      z.enum(["professional", "friendly", "casual", "formal"]),
      z.object({
        type: z.literal("custom"),
        description: z.string().max(500, "Custom personality description too long"),
      }),
    ]).default("professional"),
    customInstructions: z.string()
      .min(1, "Custom instructions cannot be empty")
      .max(10000, "Custom instructions too long")
      .default(DEFAULT_CUSTOM_INSTRUCTIONS),
    mainLanguage: z.string()
      .min(2, "Language code must be at least 2 characters")
      .max(10, "Language code too long")
      .default("en"),
    adaptToCustomerLanguage: z.boolean().default(false),
  }).default({
    welcomeMessage: "Hello! Welcome to our service. How can I help you today?",
    suggestedPrompts: [
      "What services do you offer?",
      "How can I book an appointment?",
      "What are your business hours?",
      "Tell me about pricing",
    ],
    fallbackMessage: "Apologies, I do not have that information. Please contact our support team for further assistance.",
    aiPersonality: "professional",
    customInstructions: DEFAULT_CUSTOM_INSTRUCTIONS,
    mainLanguage: "en",
    adaptToCustomerLanguage: false,
  }),
  
  // Widget UI configuration
  widgetSettings: z.object({
    mode: z.enum(["floating", "fullpage"]).default("floating"),
    tooltipText: z.string()
      .min(1, "Tooltip text cannot be empty")
      .max(100, "Tooltip text too long")
      .default("Chat with us!"),
    position: z.enum(["bottom-right", "bottom-left", "top-right", "top-left"]).default("bottom-right"),
    showOnMobile: z.boolean().default(true),
    autoOpen: z.boolean().default(false),
    autoOpenDelay: z.number().min(0).max(60).default(5), // seconds
    designTheme: z.enum(["sleek", "soft", "glass", "minimal", "elevated"]).default("soft"),
    // Language and RTL settings
    enableLanguageSwitcher: z.boolean().default(false),
    supportedLanguages: z.array(z.object({
      code: z.string().min(2).max(10), // e.g., 'en', 'ar', 'fr'
      name: z.string().min(1).max(50), // e.g., 'English', 'العربية', 'Français'
      rtl: z.boolean().default(false), // Right-to-left support
    })).default([
      { code: 'en', name: 'English', rtl: false }
    ]),
    defaultLanguage: z.string().min(2).max(10).default('en'),
  }).default({
    mode: "floating",
    tooltipText: "Chat with us!",
    position: "bottom-right",
    showOnMobile: true,
    autoOpen: false,
    autoOpenDelay: 5,
    designTheme: "soft",
    enableLanguageSwitcher: false,
    supportedLanguages: [{ code: 'en', name: 'English', rtl: false }],
    defaultLanguage: 'en',
  }),
  
  // Business hours configuration (optional - not all chatbots need business hours)
  businessHours: z.object({
    enabled: z.boolean().default(false), // Toggle to enable/disable business hours
    timezone: z.string().default("UTC"),
    schedule: z.object({
      monday: z.object({
        open: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
        close: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
        closed: z.boolean().default(false),
      }).optional(),
      tuesday: z.object({
        open: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
        close: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
        closed: z.boolean().default(false),
      }).optional(),
      wednesday: z.object({
        open: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
        close: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
        closed: z.boolean().default(false),
      }).optional(),
      thursday: z.object({
        open: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
        close: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
        closed: z.boolean().default(false),
      }).optional(),
      friday: z.object({
        open: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
        close: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
        closed: z.boolean().default(false),
      }).optional(),
      saturday: z.object({
        open: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
        close: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
        closed: z.boolean().default(false),
      }).optional(),
      sunday: z.object({
        open: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
        close: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
        closed: z.boolean().default(false),
      }).optional(),
    }).default({}),
    offlineMessage: z.string()
      .max(500, "Offline message too long")
      .default("We're currently closed. Our business hours are Monday-Friday 9:00 AM - 5:00 PM."),
  }).optional().default({
    enabled: false,
    timezone: "UTC",
    schedule: {},
    offlineMessage: "We're currently closed. Our business hours are Monday-Friday 9:00 AM - 5:00 PM.",
  }),
  
  // Appointment booking configuration (optional - not all chatbots need appointments)
  appointments: z.object({
    enabled: z.boolean().default(false), // Toggle to enable/disable appointment booking
    types: z.array(
      z.object({
        id: z.string().min(1, "ID is required"),
        name: z.string().min(1, "Name is required").max(100, "Name too long"),
        duration: z.number().min(5).max(480), // Duration in minutes (5 min to 8 hours)
        description: z.string().max(500, "Description too long").optional(),
        price: z.number().min(0).optional(), // Price in cents
        color: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color").optional(),
      })
    ).max(20, "Maximum 20 appointment types allowed").default([]),
  }).optional().default({
    enabled: false,
    types: [],
  }),
  
  // Knowledge base configuration
  knowledgeBase: z.object({
    documents: z.array(z.string().url("Document must be a valid URL")).max(50, "Too many documents").optional(),
    faqs: z.array(z.object({
      question: z.string().min(1, "Question cannot be empty").max(200, "Question too long"),
      answer: z.string().min(1, "Answer cannot be empty").max(1000, "Answer too long"),
    })).max(100, "Too many FAQs").optional(),
    autoLearn: z.boolean().default(false), // Enable automatic learning from conversations
    updateFrequency: z.enum(["manual", "daily", "weekly"]).default("manual"),
  }).default({
    autoLearn: false,
    updateFrequency: "manual",
  }),
  
  // MCP Tools integration configuration
  mcpTools: z.object({
    enabled: z.boolean().default(false),
    googleCalendar: z.object({
      enabled: z.boolean().default(false),
      // Note: credentials should never be stored in config - use integration management instead
      calendarId: z.string().min(1, "Calendar ID is required").optional(),
      timezone: z.string().min(1, "Timezone is required").default("UTC"),
      allowBooking: z.boolean().default(true),
      bookingLeadTime: z.number().min(0).max(30).default(1), // Days in advance required for booking
      maxBookingDays: z.number().min(1).max(365).default(30), // How far in advance can book
    }).optional(),
    googleSheets: z.object({
      enabled: z.boolean().default(false),
      // Note: credentials should never be stored in config - use integration management instead  
      spreadsheetId: z.string().min(1, "Spreadsheet ID is required").optional(),
      worksheetName: z.string().min(1, "Worksheet name is required").default("Sheet1"),
      autoSaveLeads: z.boolean().default(true),
      dataMapping: z.record(z.string()).optional(), // Field mapping configuration
    }).optional(),
    email: z.object({
      enabled: z.boolean().default(false),
      notificationEmail: z.string().email("Must be a valid email").optional(),
      sendTranscripts: z.boolean().default(false),
      sendLeadAlerts: z.boolean().default(true),
    }).optional(),
  }).default({
    enabled: false,
  }),
  
  // Lead capture configuration
  leadCapture: z.object({
    enabled: z.boolean().default(false),
    captureMessage: z.string()
      .max(500, "Lead capture message too long")
      .default("To help serve you better, would you mind sharing your contact information?"),
    autoAskForLead: z.boolean().default(false),
    askAfterMessages: z.number().min(1).max(20).default(3),
    fields: z.object({
      name: z.object({
        enabled: z.boolean().default(true),
        required: z.boolean().default(false),
        placeholder: z.string().default("Your name"),
      }),
      email: z.object({
        enabled: z.boolean().default(true),
        required: z.boolean().default(true),
        placeholder: z.string().default("your.email@example.com"),
      }),
      phone: z.object({
        enabled: z.boolean().default(true),
        required: z.boolean().default(false),
        placeholder: z.string().default("+1 (555) 123-4567"),
      }),
    }).default({
      name: { enabled: true, required: false, placeholder: "Your name" },
      email: { enabled: true, required: true, placeholder: "your.email@example.com" },
      phone: { enabled: true, required: false, placeholder: "+1 (555) 123-4567" },
    }),
    thankYouMessage: z.string()
      .max(300, "Thank you message too long")
      .default("Thank you for sharing your information! How can I help you today?"),
    detectFromMessages: z.boolean().default(true), // Auto-detect email/phone from conversation
  }).default({
    enabled: false,
    captureMessage: "To help serve you better, would you mind sharing your contact information?",
    autoAskForLead: false,
    askAfterMessages: 3,
    fields: {
      name: { enabled: true, required: false, placeholder: "Your name" },
      email: { enabled: true, required: true, placeholder: "your.email@example.com" },
      phone: { enabled: true, required: false, placeholder: "+1 (555) 123-4567" },
    },
    thankYouMessage: "Thank you for sharing your information! How can I help you today?",
    detectFromMessages: true,
  }),
  
  // Advanced settings
  advancedSettings: z.object({
    enableAnalytics: z.boolean().default(true),
    enableChatHistory: z.boolean().default(true),
    maxConversationLength: z.number().min(10).max(1000).default(100),
    sessionTimeout: z.number().min(5).max(120).default(30), // Minutes
    requireEmail: z.boolean().default(false),
    emailCollectionMessage: z.string().max(200).optional(),
    gdprCompliant: z.boolean().default(true),
    dataRetentionDays: z.number().min(1).max(365).default(90),
    allowFileUploads: z.boolean().default(false),
    maxFileSize: z.number().min(1).max(50).default(10), // MB
    allowedFileTypes: z.array(z.string()).default(["pdf", "doc", "docx", "txt"]),
  }).default({
    enableAnalytics: true,
    enableChatHistory: true,
    maxConversationLength: 100,
    sessionTimeout: 30,
    requireEmail: false,
    gdprCompliant: true,
    dataRetentionDays: 90,
    allowFileUploads: false,
    maxFileSize: 10,
    allowedFileTypes: ["pdf", "doc", "docx", "txt"],
  }),
}).default({
  branding: {
    primaryColor: "#3B82F6",
    secondaryColor: "#10B981",
    chatWindowBgColor: "#FFFFFF",
    botMessageBgColor: "#F3F4F6",
  },
  behavior: {
    welcomeMessage: "Hello! Welcome to our service. How can I help you today?",
    suggestedPrompts: [
      "What services do you offer?",
      "How can I book an appointment?",
      "What are your business hours?",
      "Tell me about pricing",
    ],
    fallbackMessage: "Apologies, I do not have that information. Please contact our support team for further assistance.",
    aiPersonality: "professional",
    customInstructions: DEFAULT_CUSTOM_INSTRUCTIONS,
  },
  widgetSettings: {
    tooltipText: "Chat with us!",
    position: "bottom-right",
    showOnMobile: true,
    autoOpen: false,
    autoOpenDelay: 5,
    designTheme: "soft",
  },
  businessHours: {
    timezone: "UTC",
    schedule: {},
    offlineMessage: "We're currently closed. Our business hours are Monday-Friday 9:00 AM - 5:00 PM.",
  },
  appointmentTypes: [
    {
      id: "consultation",
      name: "Initial Consultation",
      duration: 30,
      description: "A 30-minute consultation to discuss your needs",
    },
    {
      id: "follow-up",
      name: "Follow-up Appointment",
      duration: 15,
      description: "A quick follow-up appointment",
    },
  ],
  knowledgeBase: {
    autoLearn: false,
    updateFrequency: "manual",
  },
  mcpTools: {
    enabled: false,
  },
  leadCapture: {
    enabled: false,
    captureMessage: "To help serve you better, would you mind sharing your contact information?",
    autoAskForLead: false,
    askAfterMessages: 3,
    fields: {
      name: { enabled: true, required: false, placeholder: "Your name" },
      email: { enabled: true, required: true, placeholder: "your.email@example.com" },
      phone: { enabled: true, required: false, placeholder: "+1 (555) 123-4567" },
    },
    thankYouMessage: "Thank you for sharing your information! How can I help you today?",
    detectFromMessages: true,
  },
  advancedSettings: {
    enableAnalytics: true,
    enableChatHistory: true,
    maxConversationLength: 100,
    sessionTimeout: 30,
    requireEmail: false,
    gdprCompliant: true,
    dataRetentionDays: 90,
    allowFileUploads: false,
    maxFileSize: 10,
    allowedFileTypes: ["pdf", "doc", "docx", "txt"],
  },
});

export type ChatbotConfig = z.infer<typeof chatbotConfigSchema>;

// Validation enums for database fields
export const messageRoleEnum = z.enum(["user", "assistant", "tool"]);
export const appointmentStatusEnum = z.enum(["scheduled", "completed", "cancelled"]);
export const leadStatusEnum = z.enum(["new", "contacted", "qualified", "converted", "lost"]);
export const clientStatusEnum = z.enum(["active", "suspended", "inactive"]);
export const chatbotStatusEnum = z.enum(["active", "inactive", "suspended"]);
export const subscriptionTypeEnum = z.enum(["trial", "basic", "professional", "enterprise"]);
export const subscriptionStatusEnum = z.enum(["active", "trial", "expired", "cancelled", "payment_due"]);
export const paymentStatusEnum = z.enum(["success", "failed", "pending", "refunded"]);
export const emailNotificationTypeEnum = z.enum([
  "trial-expiring-7days", 
  "trial-expiring-3days", 
  "trial-expiring-1day", 
  "trial-expired", 
  "payment-reminder", 
  "payment-failed", 
  "subscription-reactivated"
]);
export const emailDeliveryStatusEnum = z.enum(["pending", "sent", "delivered", "failed", "bounced"]);

// Admin users table
export const admins = pgTable("admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Clients table - businesses that use the chatbots
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  contactEmail: text("contact_email").notNull(),
  // Client portal authentication fields
  authEmail: text("auth_email").unique(), // Email for client login (nullable for existing clients)
  passwordHash: text("password_hash"), // Hashed password for client authentication
  industry: text("industry"),
  description: text("description"),
  status: text("status").default("active").notNull(), // active, suspended, inactive
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    contactEmailIdx: index("clients_contact_email_idx").on(table.contactEmail),
    authEmailIdx: index("clients_auth_email_idx").on(table.authEmail),
    statusIdx: index("clients_status_idx").on(table.status),
  };
});

// Chatbots table - each client can have multiple chatbots
export const chatbots = pgTable("chatbots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  config: jsonb("config").default({}).notNull(), // branding, behavior, knowledge base, MCP tools
  widgetUrl: text("widget_url").unique().notNull(),
  status: text("status").default("active").notNull(), // active, inactive, suspended
  messageCount: integer("message_count").default(0).notNull(),
  responseRate: integer("response_rate").default(0).notNull(), // percentage
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    clientIdIdx: index("chatbots_client_id_idx").on(table.clientId),
    statusIdx: index("chatbots_status_idx").on(table.status),
    widgetUrlIdx: index("chatbots_widget_url_idx").on(table.widgetUrl),
  };
});

// Subscriptions table - manages trial and paid subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  chatbotId: varchar("chatbot_id").references(() => chatbots.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // trial, basic, professional, enterprise
  status: text("status").notNull(), // active, trial, expired, cancelled, payment_due
  trialStart: timestamp("trial_start"),
  trialEnd: timestamp("trial_end"),
  paidUntil: timestamp("paid_until"),
  monthlyAmount: integer("monthly_amount").default(0).notNull(), // in cents
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    clientIdIdx: index("subscriptions_client_id_idx").on(table.clientId),
    chatbotIdIdx: index("subscriptions_chatbot_id_idx").on(table.chatbotId),
    statusIdx: index("subscriptions_status_idx").on(table.status),
  };
});

// Payment logs table - track all payment transactions
export const paymentLogs = pgTable("payment_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  subscriptionId: varchar("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
  amount: integer("amount").notNull(), // in cents
  currency: text("currency").default("usd").notNull(),
  status: text("status").notNull(), // success, failed, pending, refunded
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    clientIdIdx: index("payment_logs_client_id_idx").on(table.clientId),
    subscriptionIdIdx: index("payment_logs_subscription_id_idx").on(table.subscriptionId),
    statusIdx: index("payment_logs_status_idx").on(table.status),
    createdAtIdx: index("payment_logs_created_at_idx").on(table.createdAt),
  };
});

// Widget analytics table
export const widgetAnalytics = pgTable("widget_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatbotId: varchar("chatbot_id").references(() => chatbots.id, { onDelete: "cascade" }).notNull(),
  views: integer("views").default(0).notNull(),
  interactions: integer("interactions").default(0).notNull(),
  date: timestamp("date").defaultNow().notNull(),
}, (table) => {
  return {
    chatbotIdIdx: index("widget_analytics_chatbot_id_idx").on(table.chatbotId),
    dateIdx: index("widget_analytics_date_idx").on(table.date),
  };
});

// Appointments table - store appointment data from MCP Calendar integration
export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  chatbotId: varchar("chatbot_id").references(() => chatbots.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status").default("scheduled").notNull(), // scheduled, completed, cancelled
  externalId: text("external_id"), // ID from external calendar system
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    clientIdIdx: index("appointments_client_id_idx").on(table.clientId),
    chatbotIdIdx: index("appointments_chatbot_id_idx").on(table.chatbotId),
    startTimeIdx: index("appointments_start_time_idx").on(table.startTime),
    statusIdx: index("appointments_status_idx").on(table.status),
  };
});

// Leads table - store captured visitor information from chatbot interactions
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  chatbotId: varchar("chatbot_id").references(() => chatbots.id, { onDelete: "cascade" }).notNull(),
  conversationId: varchar("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  message: text("message"), // Initial message or inquiry from the lead
  notes: text("notes"), // Admin notes about the lead
  source: text("source").default("widget").notNull(), // widget, fullpage, manual, api
  status: text("status").default("new").notNull(), // new, contacted, qualified, converted, lost
  capturedAt: timestamp("captured_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    clientIdIdx: index("leads_client_id_idx").on(table.clientId),
    chatbotIdIdx: index("leads_chatbot_id_idx").on(table.chatbotId),
    conversationIdIdx: index("leads_conversation_id_idx").on(table.conversationId),
    emailIdx: index("leads_email_idx").on(table.email),
    statusIdx: index("leads_status_idx").on(table.status),
    capturedAtIdx: index("leads_captured_at_idx").on(table.capturedAt),
  };
});

// Conversations table - store chat sessions
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  chatbotId: varchar("chatbot_id").references(() => chatbots.id, { onDelete: "cascade" }).notNull(),
  sessionId: text("session_id").notNull(), // Unique identifier for widget sessions (unique per chatbot)
  startedAt: timestamp("started_at").defaultNow().notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
}, (table) => {
  return {
    clientIdIdx: index("conversations_client_id_idx").on(table.clientId),
    chatbotIdIdx: index("conversations_chatbot_id_idx").on(table.chatbotId),
    lastMessageAtIdx: index("conversations_last_message_at_idx").on(table.lastMessageAt),
    // Composite unique constraint: sessionId must be unique per chatbot
    sessionUniqueIdx: uniqueIndex("conversations_session_unique_idx").on(table.chatbotId, table.sessionId),
  };
});

// Messages table - store individual chat messages
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
  role: text("role").notNull(), // user, assistant, tool
  content: text("content").notNull(),
  metadata: jsonb("metadata").default({}), // For storing additional message data
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    conversationIdIdx: index("messages_conversation_id_idx").on(table.conversationId),
    roleIdx: index("messages_role_idx").on(table.role),
    createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
  };
});

// Custom type for vector embeddings (pgvector)
const vector = customType<{
  data: number[];
  driverData: string;
}>({
  dataType() {
    return 'vector(1536)'; // OpenAI embeddings are 1536 dimensions
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  }
});

// Knowledge base documents table
export const kbDocuments = pgTable("kb_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatbotId: varchar("chatbot_id").references(() => chatbots.id, { onDelete: "cascade" }).notNull(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  storagePath: text("storage_path").notNull(),
  status: text("status").notNull().default("uploaded"), // uploaded|processing|ready|error
  checksum: text("checksum").notNull(), // SHA256 hash
  version: integer("version").notNull().default(1),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    chatbotIdIdx: index("kb_documents_chatbot_id_idx").on(table.chatbotId),
    statusIdx: index("kb_documents_status_idx").on(table.status),
    checksumIdx: index("kb_documents_checksum_idx").on(table.checksum),
    // Unique constraint: same file (checksum) can't be uploaded twice for same chatbot
    checksumUniqueIdx: uniqueIndex("kb_documents_checksum_unique_idx").on(table.chatbotId, table.checksum),
  };
});

// Knowledge base chunks table with vector embeddings
export const kbChunks = pgTable("kb_chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").references(() => kbDocuments.id, { onDelete: "cascade" }).notNull(),
  chatbotId: varchar("chatbot_id").references(() => chatbots.id, { onDelete: "cascade" }).notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  text: text("text").notNull(),
  tokenCount: integer("token_count").notNull(),
  embedding: vector("embedding"), // Vector embedding for similarity search
  metadata: jsonb("metadata").default({}), // Additional chunk metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    documentIdIdx: index("kb_chunks_document_id_idx").on(table.documentId),
    chatbotIdIdx: index("kb_chunks_chatbot_id_idx").on(table.chatbotId),
    chunkIndexIdx: index("kb_chunks_chunk_index_idx").on(table.chunkIndex),
    // For vector similarity search using pgvector
    // The index will be created automatically when using pgvector operators
  };
});

// Email settings table - store admin configuration for email notifications
export const emailSettings = pgTable("email_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  notificationType: text("notification_type").notNull().unique(), // trial-expiring-7days, payment-reminder, etc.
  enabled: boolean("enabled").default(true).notNull(),
  triggerDays: integer("trigger_days"), // Days before event to send notification (null for immediate notifications)
  fromEmail: text("from_email").default("noreply@chatbotsaas.com").notNull(),
  fromName: text("from_name").default("Chatbot SaaS").notNull(),
  replyToEmail: text("reply_to_email").default("support@chatbotsaas.com").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    notificationTypeIdx: index("email_settings_notification_type_idx").on(table.notificationType),
    enabledIdx: index("email_settings_enabled_idx").on(table.enabled),
  };
});

// Email notifications table - track all sent notifications
export const emailNotifications = pgTable("email_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  subscriptionId: varchar("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
  notificationType: text("notification_type").notNull(), // trial-expiring-7days, payment-reminder, etc.
  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  templateData: jsonb("template_data").default({}).notNull(), // Data used to render the template
  deliveryStatus: text("delivery_status").default("pending").notNull(), // pending, sent, delivered, failed, bounced
  messageId: text("message_id"), // SendGrid message ID for tracking
  errorMessage: text("error_message"), // Error details if delivery failed
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  scheduledFor: timestamp("scheduled_for"), // When the notification should be sent (for scheduled sends)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    clientIdIdx: index("email_notifications_client_id_idx").on(table.clientId),
    subscriptionIdIdx: index("email_notifications_subscription_id_idx").on(table.subscriptionId),
    notificationTypeIdx: index("email_notifications_notification_type_idx").on(table.notificationType),
    recipientEmailIdx: index("email_notifications_recipient_email_idx").on(table.recipientEmail),
    deliveryStatusIdx: index("email_notifications_delivery_status_idx").on(table.deliveryStatus),
    scheduledForIdx: index("email_notifications_scheduled_for_idx").on(table.scheduledFor),
    sentAtIdx: index("email_notifications_sent_at_idx").on(table.sentAt),
    createdAtIdx: index("email_notifications_created_at_idx").on(table.createdAt),
    // Composite index to prevent duplicate notifications for same client/type/date
    clientTypeUniqueDayIdx: index("email_notifications_client_type_day_idx").on(table.clientId, table.notificationType, sql`DATE(created_at)`),
  };
});

// Insert schemas
export const insertAdminSchema = createInsertSchema(admins).omit({
  id: true,
  createdAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const insertChatbotSchema = createInsertSchema(chatbots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  widgetUrl: true,
  messageCount: true,
  responseRate: true,
}).extend({
  config: chatbotConfigSchema.optional(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentLogSchema = createInsertSchema(paymentLogs).omit({
  id: true,
  createdAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  capturedAt: true,
  updatedAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  startedAt: true,
  lastMessageAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

// KB schemas
export const insertKBDocumentSchema = createInsertSchema(kbDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  version: true,
});

export const insertKBChunkSchema = createInsertSchema(kbChunks).omit({
  id: true,
  createdAt: true,
});

// Email schemas
export const insertEmailSettingsSchema = createInsertSchema(emailSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailNotificationSchema = createInsertSchema(emailNotifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Chatbot = typeof chatbots.$inferSelect;
export type InsertChatbot = z.infer<typeof insertChatbotSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type PaymentLog = typeof paymentLogs.$inferSelect;
export type InsertPaymentLog = z.infer<typeof insertPaymentLogSchema>;

export type WidgetAnalytics = typeof widgetAnalytics.$inferSelect;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type KBDocument = typeof kbDocuments.$inferSelect;
export type InsertKBDocument = z.infer<typeof insertKBDocumentSchema>;

export type KBChunk = typeof kbChunks.$inferSelect;
export type InsertKBChunk = z.infer<typeof insertKBChunkSchema>;

export type EmailSettings = typeof emailSettings.$inferSelect;
export type InsertEmailSettings = z.infer<typeof insertEmailSettingsSchema>;

export type EmailNotification = typeof emailNotifications.$inferSelect;
export type InsertEmailNotification = z.infer<typeof insertEmailNotificationSchema>;

// Extended types for API responses
export type ClientWithChatbots = Client & {
  chatbots: Chatbot[];
  subscription: Subscription | null;
};

export type ChatbotWithClient = Chatbot & {
  client: Client;
  subscription: Subscription | null;
};

export type SubscriptionWithClient = Subscription & {
  client: Client;
  chatbot: Chatbot | null;
};

// Extended types for client portal functionality
export type ConversationWithMessages = Conversation & {
  messages: Message[];
  chatbot: Chatbot;
};

export type LeadWithClient = Lead & {
  client: Client;
  chatbot: Chatbot;
};

export type AppointmentWithClient = Appointment & {
  client: Client;
  chatbot: Chatbot;
};

export type ClientWithPortalData = Client & {
  conversations: Conversation[];
  leads: Lead[];
  appointments: Appointment[];
};

// Validation schemas for client credential management
export const clientCredentialsSchema = z.object({
  authEmail: z.string().email("Must be a valid email address").min(1, "Email is required"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[A-Za-z])(?=.*\d)/, "Password must contain at least one letter and one number"),
});

export const clientPortalStatusSchema = z.object({
  hasAccess: z.boolean(),
  authEmail: z.string().nullable(),
  lastLogin: z.string().nullable().optional(),
  portalUrl: z.string(),
});

export type ClientCredentials = z.infer<typeof clientCredentialsSchema>;
export type ClientPortalStatus = z.infer<typeof clientPortalStatusSchema>;

export type KBDocumentWithChunks = KBDocument & {
  chunks: KBChunk[];
};

// Plugin Manager Tables

// Plugin templates table - stores plugin definitions created by admin
export const pluginTemplates = pgTable("plugin_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  version: varchar("version", { length: 50 }).default("1.0.0"),
  config_schema: jsonb("config_schema").default({}).notNull(),
  api_configuration: jsonb("api_configuration").default({}).notNull(),
  input_schema: jsonb("input_schema").default({}).notNull(),
  output_schema: jsonb("output_schema").default({}).notNull(),
  category: varchar("category", { length: 100 }).default("general"),
  tags: text("tags").array().default({}),
  documentation_url: text("documentation_url"),
  is_active: boolean("is_active").default(true).notNull(),
  is_public: boolean("is_public").default(true).notNull(),
  created_by: varchar("created_by").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    category_idx: index("plugin_templates_category_idx").on(table.category),
    is_active_idx: index("plugin_templates_is_active_idx").on(table.is_active),
    is_public_idx: index("plugin_templates_is_public_idx").on(table.is_public),
    created_at_idx: index("plugin_templates_created_at_idx").on(table.created_at),
  };
});

// Chatbot plugin instances table - stores client-specific plugin configurations
export const chatbotPlugins = pgTable("chatbot_plugins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatbot_id: varchar("chatbot_id").references(() => chatbots.id, { onDelete: "cascade" }).notNull(),
  plugin_template_id: varchar("plugin_template_id").references(() => pluginTemplates.id, { onDelete: "cascade" }).notNull(),
  config: jsonb("config").default({}).notNull(),
  is_enabled: boolean("is_enabled").default(false).notNull(),
  trigger_rules: jsonb("trigger_rules").default({}).notNull(),
  settings: jsonb("settings").default({}).notNull(),
  usage_count: integer("usage_count").default(0).notNull(),
  last_used_at: timestamp("last_used_at"),
  configured_by: varchar("configured_by").references(() => clients.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    chatbot_id_idx: index("chatbot_plugins_chatbot_id_idx").on(table.chatbot_id),
    plugin_template_id_idx: index("chatbot_plugins_plugin_template_id_idx").on(table.plugin_template_id),
    is_enabled_idx: index("chatbot_plugins_is_enabled_idx").on(table.is_enabled),
    created_at_idx: index("chatbot_plugins_created_at_idx").on(table.created_at),
    // Ensure unique plugin per chatbot
    chatbot_plugin_unique_idx: uniqueIndex("chatbot_plugins_chatbot_plugin_unique_idx").on(table.chatbot_id, table.plugin_template_id),
  };
});

// Plugin execution logs table - tracks plugin executions and results
export const pluginExecutionLogs = pgTable("plugin_execution_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatbot_plugin_id: varchar("chatbot_plugin_id").references(() => chatbotPlugins.id, { onDelete: "cascade" }).notNull(),
  conversation_id: varchar("conversation_id").references(() => conversations.id, { onDelete: "cascade" }),
  input_data: jsonb("input_data").default({}).notNull(),
  output_data: jsonb("output_data").default({}).notNull(),
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  started_at: timestamp("started_at").defaultNow().notNull(),
  completed_at: timestamp("completed_at"),
  execution_duration_ms: integer("execution_duration_ms"),
  error_message: text("error_message"),
  error_details: jsonb("error_details"),
  metadata: jsonb("metadata").default({}),
}, (table) => {
  return {
    chatbot_plugin_id_idx: index("plugin_execution_logs_chatbot_plugin_id_idx").on(table.chatbot_plugin_id),
    conversation_id_idx: index("plugin_execution_logs_conversation_id_idx").on(table.conversation_id),
    status_idx: index("plugin_execution_logs_status_idx").on(table.status),
    started_at_idx: index("plugin_execution_logs_started_at_idx").on(table.started_at),
  };
});

// Plugin Manager Validation Enums
export const pluginStatusEnum = z.enum(["pending", "success", "error", "timeout"]);
export const pluginCategoryEnum = z.enum(["integration", "automation", "communication", "data", "general"]);

// Plugin Manager Validation Schemas
export const pluginTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  description: z.string().optional(),
  version: z.string().default("1.0.0"),
  configSchema: z.record(z.any()).default({}),
  apiConfiguration: z.record(z.any()).default({}),
  inputSchema: z.record(z.any()).default({}),
  outputSchema: z.record(z.any()).optional(),
  category: pluginCategoryEnum.default("general"),
  tags: z.array(z.string()).default([]),
  documentationUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true),
});

export const chatbotPluginSchema = z.object({
  chatbotId: z.string().min(1, "Chatbot ID is required"),
  pluginTemplateId: z.string().min(1, "Plugin template ID is required"),
  config: z.record(z.any()).default({}),
  isEnabled: z.boolean().default(false),
  triggerRules: z.record(z.any()).default({}),
  settings: z.record(z.any()).default({}),
});

export const pluginExecutionLogSchema = z.object({
  chatbotPluginId: z.string().min(1, "Chatbot plugin ID is required"),
  conversationId: z.string().optional(),
  inputData: z.record(z.any()).default({}),
  outputData: z.record(z.any()).default({}),
  status: pluginStatusEnum.default("pending"),
  executionDurationMs: z.number().optional(),
  errorMessage: z.string().optional(),
  errorDetails: z.record(z.any()).optional(),
  metadata: z.record(z.any()).default({}),
});

// Trigger Rules Schema
export const triggerRulesSchema = z.object({
  keywords: z.array(z.string()).default([]),
  messageCount: z.number().min(1).optional(),
  userIntent: z.string().optional(),
  timeConditions: z.object({
    businessHoursOnly: z.boolean().default(false),
    timezone: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
  }).optional(),
  conversationPatterns: z.object({
    containsEmail: z.boolean().default(false),
    containsPhone: z.boolean().default(false),
    containsUrl: z.boolean().default(false),
    minMessageLength: z.number().optional(),
    maxMessageLength: z.number().optional(),
  }).optional(),
  customConditions: z.record(z.any()).optional(),
});

// Plugin Manager Insert Schemas
export const insertPluginTemplateSchema = createInsertSchema(pluginTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
}).extend(pluginTemplateSchema.shape);

export const insertChatbotPluginSchema = createInsertSchema(chatbotPlugins).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  usageCount: true,
  lastUsedAt: true,
  configuredBy: true,
}).extend(chatbotPluginSchema.shape);

export const insertPluginExecutionLogSchema = createInsertSchema(pluginExecutionLogs).omit({
  id: true,
  startedAt: true,
  completedAt: true,
}).extend(pluginExecutionLogSchema.shape);

// Plugin Manager Types
export type PluginTemplate = typeof pluginTemplates.$inferSelect;
export type InsertPluginTemplate = z.infer<typeof insertPluginTemplateSchema>;

export type ChatbotPlugin = typeof chatbotPlugins.$inferSelect;
export type InsertChatbotPlugin = z.infer<typeof insertChatbotPluginSchema>;

export type PluginExecutionLog = typeof pluginExecutionLogs.$inferSelect;
export type InsertPluginExecutionLog = z.infer<typeof insertPluginExecutionLogSchema>;

export type TriggerRules = z.infer<typeof triggerRulesSchema>;

// Extended types for API responses
export type ChatbotPluginWithTemplate = ChatbotPlugin & {
  pluginTemplate: PluginTemplate;
  chatbot: Chatbot;
};

export type PluginExecutionLogWithDetails = PluginExecutionLog & {
  chatbotPlugin: ChatbotPluginWithTemplate;
  conversation: Conversation | null;
};

export type PluginTemplateWithUsage = PluginTemplate & {
  usageCount: number;
  activeInstances: number;
};

// Export the default custom instructions constant
export { DEFAULT_CUSTOM_INSTRUCTIONS };
