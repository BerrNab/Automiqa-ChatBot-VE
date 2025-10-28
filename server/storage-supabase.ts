import { supabase, supabaseAdmin } from './database/supabase';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import type {
  Admin,
  InsertAdmin,
  Client,
  InsertClient,
  Chatbot,
  InsertChatbot,
  Subscription,
  InsertSubscription,
  PaymentLog,
  InsertPaymentLog,
  Appointment,
  InsertAppointment,
  Lead,
  InsertLead,
  Conversation,
  InsertConversation,
  Message,
  InsertMessage,
  KBDocument,
  InsertKBDocument,
  KBChunk,
  InsertKBChunk,
  EmailSettings,
  InsertEmailSettings,
  EmailNotification,
  InsertEmailNotification,
  ClientWithChatbots,
  ChatbotWithClient,
  SubscriptionWithClient,
  ConversationWithMessages,
  LeadWithClient,
  AppointmentWithClient,
  KBDocumentWithChunks
} from 'server/shared/schema';

export interface IStorage {
  // Admin management
  getAdmin(id: string): Promise<Admin | undefined>;
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;

  // Client management
  getClient(id: string): Promise<Client | undefined>;
  getClientsWithChatbots(): Promise<ClientWithChatbots[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: string): Promise<void>;

  // Chatbot management
  getChatbot(id: string): Promise<Chatbot | undefined>;
  getChatbotsWithClients(): Promise<ChatbotWithClient[]>;
  getChatbotForWidget(id: string): Promise<ChatbotWithClient | undefined>;
  createChatbot(chatbot: InsertChatbot & { widgetUrl: string }): Promise<Chatbot>;
  updateChatbotStatus(id: string, status: string): Promise<Chatbot>;
  updateChatbotConfig(id: string, config: any): Promise<Chatbot>;
  updateChatbotDetails(id: string, details: { name?: string; description?: string }): Promise<Chatbot>;
  updateChatbotWidgetUrl(id: string, widgetUrl: string): Promise<Chatbot>;
  incrementMessageCount(id: string): Promise<void>;

  // Subscription management
  getSubscription(id: string): Promise<Subscription | undefined>;
  getSubscriptionsWithClients(statusFilter?: string): Promise<SubscriptionWithClient[]>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  convertTrialToPaid(id: string, data: { type: string; monthlyAmount: number }): Promise<Subscription>;
  extendTrial(id: string, days: number): Promise<Subscription>;
  suspendSubscription(id: string): Promise<Subscription>;
  reactivateSubscription(id: string): Promise<Subscription>;

  // Payment management
  getPaymentLog(id: string): Promise<PaymentLog | undefined>;
  getPaymentsWithClients(statusFilter?: string, dateFilter?: string): Promise<any[]>;
  createPaymentLog(payment: InsertPaymentLog): Promise<PaymentLog>;
  updatePaymentStatus(id: string, status: string): Promise<PaymentLog>;

  // Analytics and dashboard
  getDashboardStats(): Promise<{
    totalClients: number;
    activeChatbots: number;
    monthlyRevenue: number;
    trialConversionRate: number;
  }>;
  getRecentActivities(): Promise<Array<{
    id: string;
    message: string;
    timestamp: string;
    type: "success" | "info" | "warning" | "error";
  }>>;
  getSubscriptionStatus(): Promise<{
    activePaid: number;
    freeTrial: number;
    paymentDue: number;
    expired: number;
  }>;
  getPaymentStats(): Promise<{
    totalRevenue: number;
    failedPayments: number;
    successRate: number;
  }>;
  getWidgetsWithAnalytics(): Promise<any[]>;

  // Widget analytics
  trackWidgetView(chatbotId: string): Promise<void>;
  trackWidgetInteraction(chatbotId: string): Promise<void>;

  // Logo management
  uploadChatbotLogo(chatbotId: string, file: Buffer, mimeType: string): Promise<string>;
  deleteChatbotLogo(chatbotId: string, logoUrl: string): Promise<void>;

  // Client portal authentication
  getClientByAuthEmail(authEmail: string): Promise<Client | undefined>;
  setClientCredentials(clientId: string, authEmail: string, passwordHash: string): Promise<Client>;
  createClientWithAuth(clientData: InsertClient, authEmail: string, password: string): Promise<Client>;

  // Appointment management
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointmentsByClientId(clientId: string): Promise<AppointmentWithClient[]>;
  updateAppointment(id: string, appointmentData: Partial<InsertAppointment>, clientId: string): Promise<Appointment>;
  deleteAppointment(id: string, clientId: string): Promise<void>;

  // Lead management  
  createLead(lead: InsertLead): Promise<Lead>;
  getLeadsByClientId(clientId: string): Promise<LeadWithClient[]>;
  getLeadsByChatbotId(chatbotId: string): Promise<Lead[]>;
  updateLead(id: string, leadData: Partial<InsertLead>, clientId: string): Promise<Lead>;
  updateLeadStatus(leadId: string, status: string, notes?: string): Promise<Lead>;
  deleteLead(id: string, clientId: string): Promise<void>;
  checkExistingLead(chatbotId: string, conversationId?: string, email?: string): Promise<Lead | undefined>;

  // Conversation management
  createOrUpdateConversation(conversationData: InsertConversation): Promise<Conversation>;
  getConversationsByClientId(clientId: string): Promise<Conversation[]>;
  getConversationById(id: string, clientId: string): Promise<ConversationWithMessages | undefined>;

  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConversationId(conversationId: string, clientId: string): Promise<Message[]>;

  // Knowledge Base management
  createKBDocument(document: InsertKBDocument & { id: string }): Promise<KBDocument>;
  getKBDocument(id: string): Promise<KBDocument | undefined>;
  getKBDocuments(chatbotId: string): Promise<KBDocument[]>;
  getDocumentByChecksum(chatbotId: string, checksum: string): Promise<KBDocument | undefined>;
  updateKBDocumentStatus(id: string, status: string, errorMessage?: string): Promise<KBDocument>;
  deleteKBDocument(id: string): Promise<void>;

  // Knowledge Base chunks
  createKBChunk(chunk: InsertKBChunk & { id: string }): Promise<KBChunk>;
  getKBChunks(documentId: string): Promise<KBChunk[]>;
  searchKBChunks(chatbotId: string, queryEmbedding: number[], limit: number): Promise<Array<{
    text: string;
    similarity: number;
    filename: string;
    metadata: any;
  }>>;
  deleteKBChunks(documentId: string): Promise<void>;

  // Email notification settings
  getEmailSettings(notificationType?: string): Promise<EmailSettings[]>;
  createEmailSettings(settings: InsertEmailSettings): Promise<EmailSettings>;
  updateEmailSettings(id: string, settings: Partial<InsertEmailSettings>): Promise<EmailSettings>;
  deleteEmailSettings(id: string): Promise<void>;

  // Email notification tracking
  getEmailNotifications(filters?: {
    clientId?: string;
    notificationType?: string;
    deliveryStatus?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }): Promise<EmailNotification[]>;
  createEmailNotification(notification: InsertEmailNotification): Promise<EmailNotification>;
  updateEmailNotificationStatus(id: string, status: string, errorMessage?: string): Promise<EmailNotification>;
  checkNotificationSent(clientId: string, notificationType: string, withinHours?: number): Promise<boolean>;

  // Email notification statistics
  getEmailNotificationStats(dateFrom?: Date, dateTo?: Date): Promise<{
    totalSent: number;
    delivered: number;
    failed: number;
    pending: number;
    byType: Record<string, { sent: number; delivered: number; failed: number }>;
  }>;
}


export class SupabaseStorage implements IStorage {
  // Helper function to parse config field
  private parseConfig(config: any): any {
    if (!config) return {};
    
    if (typeof config === 'string') {
      try {
        return JSON.parse(config);
      } catch (e) {
        console.error('Error parsing config string:', e);
      }
    } else if (typeof config === 'object' && Object.keys(config).every(key => !isNaN(Number(key)))) {
      // Handle character index format
      const configStr = Object.values(config).join('');
      try {
        return JSON.parse(configStr);
      } catch (e) {
        console.error('Error parsing config from character indices:', e);
      }
    }
    
    return config;
  }
  // Admin management
  async getAdmin(id: string): Promise<Admin | undefined> {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as Admin;
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error || !data) return undefined;
    return data as Admin;
  }

  async createAdmin(insertAdmin: InsertAdmin): Promise<Admin> {
    const hashedPassword = await bcrypt.hash(insertAdmin.password, 10);
    
    const { data, error } = await supabaseAdmin
      .from('admins')
      .insert({
        id: nanoid(),
        username: insertAdmin.username,
        email: insertAdmin.email,
        password: hashedPassword
      })
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create admin: ${error.message}`);
    return data as Admin;
  }

  // Client management
  async getClient(id: string): Promise<Client | undefined> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as Client;
  }

  async getClientsWithChatbots(): Promise<ClientWithChatbots[]> {
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*');
    
    if (clientsError) throw new Error(`Failed to fetch clients: ${clientsError.message}`);
    
    const result: ClientWithChatbots[] = [];
    
    for (const client of clients) {
      // Get chatbots for this client
      const { data: chatbots, error: chatbotsError } = await supabase
        .from('chatbots')
        .select('*')
        .eq('client_id', client.id);
      
      if (chatbotsError) throw new Error(`Failed to fetch chatbots: ${chatbotsError.message}`);
      
      // Get subscription for this client
      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('client_id', client.id);
      
      if (subscriptionsError) throw new Error(`Failed to fetch subscriptions: ${subscriptionsError.message}`);
      
      result.push({
        ...client,
        chatbots: chatbots || [],
        subscription: subscriptions && subscriptions.length > 0 ? subscriptions[0] : null
      } as ClientWithChatbots);
    }
    
    return result;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    console.log('Creating client:', insertClient);
    const { data, error } = await supabaseAdmin
      .from('clients')
      .insert({
        id: nanoid(),
        name: insertClient.name,
        contact_email: insertClient.contactEmail,
        industry: insertClient.industry || null,
        description: insertClient.description || null,
        status: 'active',
        auth_email: null,
        password_hash: null
      })
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create client: ${error.message}`);
    return data as Client;
  }

  async updateClient(id: string, updateData: Partial<InsertClient>): Promise<Client> {
    const updateObject: any = {};
    
    if (updateData.name !== undefined) updateObject.name = updateData.name;
    if (updateData.contactEmail !== undefined) updateObject.contact_email = updateData.contactEmail;
    if (updateData.industry !== undefined) updateObject.industry = updateData.industry;
    if (updateData.description !== undefined) updateObject.description = updateData.description;
    
    const { data, error } = await supabaseAdmin
      .from('clients')
      .update(updateObject)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update client: ${error.message}`);
    return data as Client;
  }

  async deleteClient(id: string): Promise<void> {
    // Due to cascade delete in Supabase, this will delete all related records
    const { error } = await supabaseAdmin
      .from('clients')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(`Failed to delete client: ${error.message}`);
  }

  // Chatbot management
  async getChatbot(id: string): Promise<Chatbot | undefined> {
    const { data, error } = await supabase
      .from('chatbots')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    
    // Parse config field
    if (data.config) {
      data.config = this.parseConfig(data.config);
    }
    
    return data as Chatbot;
  }

  async getChatbotsWithClients(): Promise<ChatbotWithClient[]> {
    // Using a join query to get chatbots with their clients
    const { data, error } = await supabase
      .from('chatbots')
      .select(`
        *,
        client:clients(*)
      `);
    
    if (error) throw new Error(`Failed to fetch chatbots with clients: ${error.message}`);
    
    // Get subscriptions and stats for each chatbot
    const result: ChatbotWithClient[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const chatbot of data || []) {
      // Parse config field
      if (chatbot.config) {
        chatbot.config = this.parseConfig(chatbot.config);
      }
      
      // Get subscription
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('client_id', chatbot.client_id);
      
      // Get message count for today
      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chatbot_id', chatbot.id)
        .gte('created_at', today.toISOString());
      
      // Get total conversations and conversations with responses
      const { count: totalConversations } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('chatbot_id', chatbot.id);
      
      // Count conversations that have at least one assistant message
      const { data: conversationsWithResponses } = await supabase
        .from('messages')
        .select('conversation_id')
        .eq('chatbot_id', chatbot.id)
        .eq('role', 'assistant');
      
      const uniqueConversationsWithResponses = new Set(
        conversationsWithResponses?.map(m => m.conversation_id) || []
      ).size;
      
      const responseRate = totalConversations && totalConversations > 0
        ? Math.round((uniqueConversationsWithResponses / totalConversations) * 100)
        : 0;
      
      console.log(`[Stats] Chatbot ${chatbot.id}: messages=${messageCount}, conversations=${totalConversations}, withResponses=${uniqueConversationsWithResponses}, rate=${responseRate}%`);
      
      result.push({
        ...chatbot,
        client: chatbot.client,
        subscription: subscriptions && subscriptions.length > 0 ? subscriptions[0] : null,
        messageCount: messageCount || 0,
        responseRate: responseRate
      } as ChatbotWithClient);
    }
    
    return result;
  }

  async getChatbotForWidget(id: string): Promise<ChatbotWithClient | undefined> {
    // First try to find the chatbot by ID
    let { data, error } = await supabase
      .from('chatbots')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('id', id)
      .single();
    
    // If not found by ID, try to find by widget_url
    if (error || !data) {
      const result = await supabase
        .from('chatbots')
        .select(`
          *,
          client:clients(*)
        `)
        .ilike('widget_url', `%${id}%`)
        .single();
      
      data = result.data;
      error = result.error;
    }
    
    if (error || !data) return undefined;
    
    // Parse config field
    if (data.config) {
      data.config = this.parseConfig(data.config);
    }
    
    // Get subscription for this chatbot's client
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('client_id', data.client_id);
    
    return {
      ...data,
      client: data.client,
      subscription: subscriptions && subscriptions.length > 0 ? subscriptions[0] : null
    } as ChatbotWithClient;
  }

  async createChatbot(insertChatbot: InsertChatbot & { widgetUrl: string }): Promise<Chatbot> {
    // Ensure config is properly formatted
    const config = this.parseConfig(insertChatbot.config || {});
    
    const { data, error } = await supabaseAdmin
      .from('chatbots')
      .insert({
        id: nanoid(),
        client_id: insertChatbot.clientId,
        name: insertChatbot.name,
        description: insertChatbot.description || null,
        config: config,
        widget_url: insertChatbot.widgetUrl,
        status: 'active',
        message_count: 0,
        response_rate: 0
      })
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create chatbot: ${error.message}`);
    
    // Parse config field in the response
    if (data && data.config) {
      data.config = this.parseConfig(data.config);
    }
    
    return data as Chatbot;
  }

  async updateChatbotStatus(id: string, status: string): Promise<Chatbot> {
    const { data, error } = await supabaseAdmin
      .from('chatbots')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update chatbot status: ${error.message}`);
    
    // Parse config field in the response
    if (data && data.config) {
      data.config = this.parseConfig(data.config);
    }
    
    return data as Chatbot;
  }

  async updateChatbotConfig(id: string, config: any): Promise<Chatbot> {
    // Ensure config is properly formatted
    const parsedConfig = this.parseConfig(config);
    
    const { data, error } = await supabaseAdmin
      .from('chatbots')
      .update({ config: parsedConfig })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update chatbot config: ${error.message}`);
    
    // Parse config field in the response
    if (data && data.config) {
      data.config = this.parseConfig(data.config);
    }
    
    return data as Chatbot;
  }

  async updateChatbotWidgetUrl(id: string, widgetUrl: string): Promise<Chatbot> {
    const { data, error } = await supabaseAdmin
      .from('chatbots')
      .update({ widget_url: widgetUrl })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update chatbot widget URL: ${error.message}`);
    
    // Parse config field in the response
    if (data && data.config) {
      data.config = this.parseConfig(data.config);
    }
    
    return data as Chatbot;
  }
  
  async updateChatbotDetails(id: string, details: { name?: string; description?: string }): Promise<Chatbot> {
    const updateData: any = {};
    if (details.name !== undefined) updateData.name = details.name;
    if (details.description !== undefined) updateData.description = details.description;
    
    const { data, error } = await supabaseAdmin
      .from('chatbots')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update chatbot details: ${error.message}`);
    
    // Parse config field in the response
    if (data && data.config) {
      data.config = this.parseConfig(data.config);
    }
    
    return data as Chatbot;
  }

  async incrementMessageCount(id: string): Promise<void> {
    try {
      console.log(`Incrementing message count for chatbot: ${id}`);
      
      const { data: chatbot, error } = await supabase
        .from('chatbots')
        .select('message_count')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error(`Error fetching chatbot for message count increment:`, error);
        return;
      }
      
      if (!chatbot) {
        console.error(`Chatbot not found for message count increment: ${id}`);
        return;
      }
      
      const { error: updateError } = await supabaseAdmin
        .from('chatbots')
        .update({ 
          message_count: (chatbot.message_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (updateError) {
        console.error(`Error updating message count:`, updateError);
      } else {
        console.log(`Successfully incremented message count for chatbot: ${id}`);
      }
    } catch (error) {
      console.error(`Error in incrementMessageCount:`, error);
      // Don't throw error - this is a non-critical operation
    }
  }

  // Knowledge Base management
  async createKBDocument(document: InsertKBDocument & { id: string }): Promise<KBDocument> {
    const { data, error } = await supabaseAdmin
      .from('kb_documents')
      .insert({
        id: document.id,
        chatbot_id: document.chatbotId,
        filename: document.filename,
        content_type: document.contentType,
        size: document.size,
        storage_path: document.storagePath,
        status: document.status,
        checksum: document.checksum,
        version: 1,
        error_message: null
      })
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create KB document: ${error.message}`);
    return data as KBDocument;
  }

  async getKBDocument(id: string): Promise<KBDocument | undefined> {
    const { data, error } = await supabase
      .from('kb_documents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    
    // Map snake_case to camelCase
    return {
      ...data,
      chatbotId: data.chatbot_id,
      contentType: data.content_type,
      storagePath: data.storage_path,
      errorMessage: data.error_message,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as KBDocument;
  }

  async getKBDocuments(chatbotId: string): Promise<KBDocument[]> {
    const { data, error } = await supabase
      .from('kb_documents')
      .select('*')
      .eq('chatbot_id', chatbotId)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Failed to fetch KB documents: ${error.message}`);
    
    // Map snake_case to camelCase for all documents
    return (data || []).map(doc => ({
      ...doc,
      chatbotId: doc.chatbot_id,
      contentType: doc.content_type,
      storagePath: doc.storage_path,
      errorMessage: doc.error_message,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    })) as KBDocument[];
  }

  async getDocumentByChecksum(chatbotId: string, checksum: string): Promise<KBDocument | undefined> {
    const { data, error } = await supabase
      .from('kb_documents')
      .select('*')
      .eq('chatbot_id', chatbotId)
      .eq('checksum', checksum)
      .single();
    
    if (error || !data) return undefined;
    
    // Map snake_case to camelCase
    return {
      ...data,
      chatbotId: data.chatbot_id,
      contentType: data.content_type,
      storagePath: data.storage_path,
      errorMessage: data.error_message,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as KBDocument;
  }

  async updateKBDocumentStatus(id: string, status: string, errorMessage?: string): Promise<KBDocument> {
    const updateData: any = { 
      status,
      updated_at: new Date().toISOString()
    };
    
    if (errorMessage) {
      updateData.error_message = errorMessage;
    }
    
    const { data, error } = await supabaseAdmin
      .from('kb_documents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update KB document status: ${error.message}`);
    return data as KBDocument;
  }

  async updateKBDocumentProgress(id: string, processedChunks: number, totalChunks: number): Promise<void> {
    const progress = Math.round((processedChunks / totalChunks) * 100);
    
    const { error } = await supabaseAdmin
      .from('kb_documents')
      .update({ 
        processing_progress: progress,
        processed_chunks: processedChunks,
        total_chunks: totalChunks,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) {
      console.error(`Failed to update KB document progress: ${error.message}`);
      // Don't throw error, just log it - progress updates shouldn't break the flow
    }
  }

  async deleteKBDocument(id: string): Promise<void> {
    // First get the document to find its storage path
    const { data: document } = await supabase
      .from('kb_documents')
      .select('storage_path')
      .eq('id', id)
      .single();
    
    if (document) {
      // Delete from Supabase Storage
      await supabaseAdmin.storage
        .from('knowledge-base-docs')
        .remove([document.storage_path]);
    }
    
    // Delete the document record (cascades to chunks)
    const { error } = await supabaseAdmin
      .from('kb_documents')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(`Failed to delete KB document: ${error.message}`);
  }

  // Knowledge Base chunks
  async createKBChunk(chunk: InsertKBChunk & { id: string }): Promise<KBChunk> {
    const { data, error } = await supabaseAdmin
      .from('kb_chunks')
      .insert({
        id: chunk.id,
        document_id: chunk.documentId,
        chatbot_id: chunk.chatbotId,
        chunk_index: chunk.chunkIndex,
        text: chunk.text,
        token_count: chunk.tokenCount,
        embedding: chunk.embedding,
        metadata: chunk.metadata || {}
      })
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create KB chunk: ${error.message}`);
    return data as KBChunk;
  }

  async getKBChunks(documentId: string): Promise<KBChunk[]> {
    const { data, error } = await supabase
      .from('kb_chunks')
      .select('*')
      .eq('document_id', documentId)
      .order('chunk_index', { ascending: true });
    
    if (error) throw new Error(`Failed to fetch KB chunks: ${error.message}`);
    return data as KBChunk[];
  }

  async searchKBChunks(chatbotId: string, queryEmbedding: number[], limit: number): Promise<Array<{
    text: string;
    similarity: number;
    filename: string;
    metadata: any;
  }>> {
    try {
      // Use the pgvector extension to find similar content
      // Lower threshold (0.5) to capture more potentially relevant results
      // The agent will filter and synthesize the best information
      const { data, error } = await supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: limit,
        p_chatbot_id: chatbotId
      });

      if (error) {
        console.error('Error searching similar content:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchKBChunks:', error);
      return [];
    }
  }

  async deleteKBChunks(documentId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('kb_chunks')
      .delete()
      .eq('document_id', documentId);
    
    if (error) throw new Error(`Failed to delete KB chunks: ${error.message}`);
  }

  // Implement other required methods from IStorage interface
  // For brevity, we'll implement the most critical ones and add stubs for the rest

  // Subscription management
  async getSubscription(id: string): Promise<Subscription | undefined> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as Subscription;
  }

  async getSubscriptionsWithClients(statusFilter?: string): Promise<SubscriptionWithClient[]> {
    let query = supabase
      .from('subscriptions')
      .select(`
        *,
        client:clients(*),
        chatbot:chatbots(*)
      `);
    
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    
    const { data, error } = await query;
    
    if (error) throw new Error(`Failed to fetch subscriptions: ${error.message}`);
    
    return (data || []).map(sub => ({
      ...sub,
      client: sub.client,
      chatbot: sub.chatbot || null
    })) as SubscriptionWithClient[];
  }

  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        id: nanoid(),
        client_id: insertSubscription.clientId,
        chatbot_id: insertSubscription.chatbotId || null,
        type: insertSubscription.type,
        status: insertSubscription.status,
        trial_start: insertSubscription.trialStart || null,
        trial_end: insertSubscription.trialEnd || null,
        paid_until: insertSubscription.paidUntil || null,
        monthly_amount: insertSubscription.monthlyAmount || 0
      })
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create subscription: ${error.message}`);
    return data as Subscription;
  }
  // Payment management
  async getPaymentLog(id: string): Promise<PaymentLog | undefined> {
    const { data, error } = await supabaseAdmin
      .from('payment_logs')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as PaymentLog;
  }

  async getPaymentsWithClients(statusFilter?: string, dateFilter?: string): Promise<any[]> {
    let query = supabaseAdmin
      .from('payment_logs')
      .select(`
        *,
        subscription:subscriptions(
          id,
          client:clients(
            id,
            name
          )
        )
      `);
    
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    
    if (dateFilter) {
      query = query.gte('created_at', dateFilter);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw new Error(`Failed to get payments: ${error.message}`);
    return data || [];
  }

  async createPaymentLog(payment: InsertPaymentLog): Promise<PaymentLog> {
    const { data, error } = await supabaseAdmin
      .from('payment_logs')
      .insert({
        id: nanoid(),
        subscription_id: payment.subscriptionId,
        amount: payment.amount,
        status: payment.status || 'pending',
        payment_method: payment.paymentMethod || null,
        transaction_id: payment.transactionId || null,
        notes: payment.notes || null
      })
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create payment log: ${error.message}`);
    return data as PaymentLog;
  }

  async updatePaymentStatus(id: string, status: string): Promise<PaymentLog> {
    const { data, error } = await supabaseAdmin
      .from('payment_logs')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update payment status: ${error.message}`);
    return data as PaymentLog;
  }

  // Analytics and dashboard
  async getDashboardStats(): Promise<{ totalClients: number; activeChatbots: number; monthlyRevenue: number; trialConversionRate: number; }> {
    // Get total clients
    const { count: totalClients } = await supabaseAdmin
      .from('clients')
      .select('*', { count: 'exact', head: true });
    
    // Get active chatbots
    const { count: activeChatbots } = await supabaseAdmin
      .from('chatbots')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    
    // Get monthly revenue from active subscriptions
    const { data: subscriptions } = await supabaseAdmin
      .from('subscriptions')
      .select('monthly_amount')
      .eq('status', 'active');
    
    const monthlyRevenue = subscriptions?.reduce((sum, sub) => sum + (sub.monthly_amount || 0), 0) || 0;
    
    // Calculate trial conversion rate
    const { count: totalTrials } = await supabaseAdmin
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'trial');
    
    const { count: convertedTrials } = await supabaseAdmin
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .neq('type', 'trial')
      .not('trial_end', 'is', null);
    
    const trialConversionRate = totalTrials && totalTrials > 0 
      ? ((convertedTrials || 0) / totalTrials) * 100 
      : 0;
    
    return {
      totalClients: totalClients || 0,
      activeChatbots: activeChatbots || 0,
      monthlyRevenue,
      trialConversionRate
    };
  }

  async getRecentActivities(): Promise<{ id: string; message: string; timestamp: string; type: "success" | "info" | "warning" | "error"; }[]> {
    // Return empty array for now - this would typically aggregate from various tables
    return [];
  }

  async getSubscriptionStatus(): Promise<{ activePaid: number; freeTrial: number; paymentDue: number; expired: number; }> {
    const { count: activePaid } = await supabaseAdmin
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .neq('type', 'trial');
    
    const { count: freeTrial } = await supabaseAdmin
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'trial');
    
    const { count: paymentDue } = await supabaseAdmin
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'payment_due');
    
    const { count: expired } = await supabaseAdmin
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'expired');
    
    return {
      activePaid: activePaid || 0,
      freeTrial: freeTrial || 0,
      paymentDue: paymentDue || 0,
      expired: expired || 0
    };
  }

  async getPaymentStats(): Promise<{ totalRevenue: number; failedPayments: number; successRate: number; }> {
    const { data: payments } = await supabaseAdmin
      .from('payment_logs')
      .select('amount, status');
    
    const totalRevenue = payments
      ?.filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    
    const failedPayments = payments?.filter(p => p.status === 'failed').length || 0;
    const totalPayments = payments?.length || 0;
    const successRate = totalPayments > 0 
      ? ((totalPayments - failedPayments) / totalPayments) * 100 
      : 0;
    
    return {
      totalRevenue,
      failedPayments,
      successRate
    };
  }

  async getWidgetsWithAnalytics(): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('chatbots')
      .select(`
        *,
        client:clients(id, name),
        analytics:widget_analytics(
          total_views,
          total_interactions,
          total_messages
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Failed to get widgets with analytics: ${error.message}`);
    return data || [];
  }

  // Widget analytics
  async trackWidgetView(chatbotId: string): Promise<void> {
    try {
      console.log(`Tracking widget view for chatbot: ${chatbotId}`);
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Check if we already have an analytics record for today
      const { data: existingRecord } = await supabase
        .from('widget_analytics')
        .select('*')
        .eq('chatbot_id', chatbotId)
        .eq('date', today)
        .single();
      
      if (existingRecord) {
        // Update existing record
        await supabase
          .from('widget_analytics')
          .update({ views: existingRecord.views + 1 })
          .eq('id', existingRecord.id);
      } else {
        // Create new record
        await supabase
          .from('widget_analytics')
          .insert({
            chatbot_id: chatbotId,
            views: 1,
            interactions: 0,
            date: today
          });
      }
    } catch (error) {
      console.error(`Error tracking widget view:`, error);
      // Don't throw error - this is a non-critical operation
    }
  }

  async trackWidgetInteraction(chatbotId: string): Promise<void> {
    try {
      console.log(`Tracking widget interaction for chatbot: ${chatbotId}`);
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Check if we already have an analytics record for today
      const { data: existingRecord } = await supabase
        .from('widget_analytics')
        .select('*')
        .eq('chatbot_id', chatbotId)
        .eq('date', today)
        .single();
      
      if (existingRecord) {
        // Update existing record
        await supabase
          .from('widget_analytics')
          .update({ interactions: existingRecord.interactions + 1 })
          .eq('id', existingRecord.id);
      } else {
        // Create new record
        await supabase
          .from('widget_analytics')
          .insert({
            chatbot_id: chatbotId,
            views: 1, // Count this as a view too
            interactions: 1,
            date: today
          });
      }
    } catch (error) {
      console.error(`Error tracking widget interaction:`, error);
      // Don't throw error - this is a non-critical operation
    }
  }

  // Logo management
  async uploadChatbotLogo(chatbotId: string, file: Buffer, mimeType: string): Promise<string> {
    const filename = `${chatbotId}-logo-${Date.now()}`;
    const { error } = await supabaseAdmin.storage
      .from('chatbot-logos')
      .upload(filename, file, {
        contentType: mimeType,
        upsert: true
      });
    
    if (error) throw new Error(`Failed to upload logo: ${error.message}`);
    
    const { data } = supabaseAdmin.storage
      .from('chatbot-logos')
      .getPublicUrl(filename);
    
    return data.publicUrl;
  }

  async deleteChatbotLogo(chatbotId: string, logoUrl: string): Promise<void> {
    // Extract filename from URL
    const urlParts = logoUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    
    const { error } = await supabaseAdmin.storage
      .from('chatbot-logos')
      .remove([filename]);
    
    if (error) throw new Error(`Failed to delete logo: ${error.message}`);
  }

  // Client portal authentication
  async getClientByAuthEmail(authEmail: string): Promise<Client | undefined> {
    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('auth_email', authEmail)
      .single();
    
    if (error || !data) return undefined;
    return data as Client;
  }

  async setClientCredentials(clientId: string, authEmail: string, passwordHash: string): Promise<Client> {
    const { data, error } = await supabaseAdmin
      .from('clients')
      .update({
        auth_email: authEmail || null,
        password_hash: passwordHash || null
      })
      .eq('id', clientId)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to set client credentials: ${error.message}`);
    return data as Client;
  }

  async createClientWithAuth(clientData: InsertClient, authEmail: string, password: string): Promise<Client> {
    const passwordHash = await bcrypt.hash(password, 10);
    const client = await this.createClient(clientData);
    await this.setClientCredentials(client.id, authEmail, passwordHash);
    return client;
  }

  // Appointment management
  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .insert({
        id: nanoid(),
        chatbot_id: (appointment as any).chatbotId,
        customer_name: (appointment as any).customerName,
        customer_email: (appointment as any).customerEmail,
        customer_phone: (appointment as any).customerPhone || null,
        appointment_date: (appointment as any).appointmentDate,
        appointment_time: (appointment as any).appointmentTime,
        service_type: (appointment as any).serviceType || null,
        notes: (appointment as any).notes || null,
        status: (appointment as any).status || 'pending'
      } as any)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create appointment: ${error.message}`);
    return data as Appointment;
  }

  async getAppointmentsByClientId(clientId: string): Promise<AppointmentWithClient[]> {
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        chatbot:chatbots(
          id,
          name
        ),
        client:clients(
          id,
          name
        )
      `)
      .eq('client_id', clientId)
      .order('appointment_date', { ascending: false });
    
    if (error) throw new Error(`Failed to get appointments: ${error.message}`);
    return (data || []) as AppointmentWithClient[];
  }

  async updateAppointment(id: string, appointmentData: Partial<InsertAppointment>, clientId: string): Promise<Appointment> {
    const updateData: any = {};
    if ((appointmentData as any).appointmentDate !== undefined) updateData.appointment_date = (appointmentData as any).appointmentDate;
    if ((appointmentData as any).appointmentTime !== undefined) updateData.appointment_time = (appointmentData as any).appointmentTime;
    if ((appointmentData as any).status !== undefined) updateData.status = (appointmentData as any).status;
    if ((appointmentData as any).notes !== undefined) updateData.notes = (appointmentData as any).notes;
    
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .update(updateData as any)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update appointment: ${error.message}`);
    return data as Appointment;
  }

  async deleteAppointment(id: string, clientId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('appointments')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(`Failed to delete appointment: ${error.message}`);
  }

  // Lead management
  async createLead(lead: InsertLead): Promise<Lead> {
    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert({
        id: nanoid(),
        client_id: (lead as any).clientId,
        chatbot_id: (lead as any).chatbotId,
        name: (lead as any).name || null,
        email: (lead as any).email || null,
        phone: (lead as any).phone || null,
        message: (lead as any).message || null,
        status: (lead as any).status || 'new',
        source: (lead as any).source || 'widget',
        conversation_id: (lead as any).conversationId || null,
        notes: (lead as any).notes || null
      } as any)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create lead: ${error.message}`);
    return data as Lead;
  }

  async getLeadsByClientId(clientId: string): Promise<LeadWithClient[]> {
    const { data, error } = await supabaseAdmin
      .from('leads')
      .select(`
        *,
        chatbot:chatbots(
          id,
          name
        ),
        client:clients(
          id,
          name
        )
      `)
      .eq('client_id', clientId)
      .order('captured_at', { ascending: false });
    
    if (error) throw new Error(`Failed to get leads: ${error.message}`);
    return (data || []) as LeadWithClient[];
  }

  async getLeadsByChatbotId(chatbotId: string): Promise<Lead[]> {
    const { data, error } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('chatbot_id', chatbotId)
      .order('captured_at', { ascending: false });
    
    if (error) throw new Error(`Failed to get leads: ${error.message}`);
    return (data || []) as Lead[];
  }

  async updateLead(id: string, leadData: Partial<InsertLead>, clientId: string): Promise<Lead> {
    const updateData: any = {};
    if ((leadData as any).name !== undefined) updateData.name = (leadData as any).name;
    if ((leadData as any).email !== undefined) updateData.email = (leadData as any).email;
    if ((leadData as any).phone !== undefined) updateData.phone = (leadData as any).phone;
    if ((leadData as any).status !== undefined) updateData.status = (leadData as any).status;
    if ((leadData as any).notes !== undefined) updateData.notes = (leadData as any).notes;
    
    const { data, error } = await supabaseAdmin
      .from('leads')
      .update(updateData as any)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update lead: ${error.message}`);
    return data as Lead;
  }

  async updateLeadStatus(leadId: string, status: string, notes?: string): Promise<Lead> {
    const updateData: any = { status };
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    
    const { data, error } = await supabaseAdmin
      .from('leads')
      .update(updateData as any)
      .eq('id', leadId)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update lead status: ${error.message}`);
    return data as Lead;
  }

  async deleteLead(id: string, clientId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('leads')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(`Failed to delete lead: ${error.message}`);
  }

  async checkExistingLead(chatbotId: string, conversationId?: string, email?: string): Promise<Lead | undefined> {
    let query = supabaseAdmin
      .from('leads')
      .select('*')
      .eq('chatbot_id', chatbotId);
    
    if (conversationId) {
      query = query.eq('conversation_id', conversationId);
    } else if (email) {
      query = query.eq('email', email);
    } else {
      return undefined;
    }
    
    const { data, error } = await query.single();
    
    if (error || !data) return undefined;
    return data as Lead;
  }

  // Conversation management
  async createOrUpdateConversation(conversationData: InsertConversation): Promise<Conversation> {
    // Try to find existing conversation
    const { data: existing } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('chatbot_id', (conversationData as any).chatbotId)
      .eq('session_id', (conversationData as any).sessionId)
      .single();
    
    if (existing) {
      // Update existing conversation
      const { data, error } = await supabaseAdmin
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString()
        } as any)
        .eq('id', (existing as any).id)
        .select()
        .single();
      
      if (error) throw new Error(`Failed to update conversation: ${error.message}`);
      return data as Conversation;
    } else {
      // Create new conversation - need to get client_id from chatbot
      const chatbot = await this.getChatbot((conversationData as any).chatbotId);
      if (!chatbot) {
        throw new Error('Chatbot not found');
      }
      
      const { data, error } = await supabaseAdmin
        .from('conversations')
        .insert({
          id: nanoid(),
          client_id: chatbot.clientId || (chatbot as any).client_id,
          chatbot_id: (conversationData as any).chatbotId,
          session_id: (conversationData as any).sessionId,
          last_message_at: new Date().toISOString()
        } as any)
        .select()
        .single();
      
      if (error) throw new Error(`Failed to create conversation: ${error.message}`);
      return data as Conversation;
    }
  }

  async getConversationsByClientId(clientId: string): Promise<Conversation[]> {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select(`
        *,
        chatbot:chatbots!inner(
          client_id
        )
      `)
      .eq('chatbot.client_id', clientId)
      .order('last_message_at', { ascending: false });
    
    if (error) throw new Error(`Failed to get conversations: ${error.message}`);
    return (data || []) as Conversation[];
  }

  async getConversationById(id: string, clientId: string): Promise<ConversationWithMessages | undefined> {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select(`
        *,
        messages(*)
      `)
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as ConversationWithMessages;
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert({
        id: nanoid(),
        conversation_id: (message as any).conversationId,
        role: (message as any).role,
        content: (message as any).content,
        metadata: (message as any).metadata || null
      } as any)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create message: ${error.message}`);
    return data as Message;
  }

  async getMessagesByConversationId(conversationId: string, clientId: string): Promise<Message[]> {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (error) throw new Error(`Failed to get messages: ${error.message}`);
    return (data || []) as Message[];
  }

  // Email notification settings
  async getEmailSettings(notificationType?: string): Promise<EmailSettings[]> {
    // Email settings feature - return empty array for now
    return [];
  }

  async createEmailSettings(settings: InsertEmailSettings): Promise<EmailSettings> {
    // Email settings feature - stub implementation
    return { id: nanoid(), ...settings, createdAt: new Date(), updatedAt: new Date() } as EmailSettings;
  }

  async updateEmailSettings(id: string, settings: Partial<InsertEmailSettings>): Promise<EmailSettings> {
    // Email settings feature - stub implementation
    return { id, ...settings, updatedAt: new Date() } as EmailSettings;
  }

  async deleteEmailSettings(id: string): Promise<void> {
    // Email settings feature - stub implementation
    return;
  }

  // Email notification tracking
  async getEmailNotifications(filters?: { clientId?: string; notificationType?: string; deliveryStatus?: string; dateFrom?: Date; dateTo?: Date; limit?: number; }): Promise<EmailNotification[]> {
    // Email notifications feature - return empty array for now
    return [];
  }

  async createEmailNotification(notification: InsertEmailNotification): Promise<EmailNotification> {
    // Email notifications feature - stub implementation
    return { id: nanoid(), ...notification, createdAt: new Date() } as EmailNotification;
  }

  async updateEmailNotificationStatus(id: string, status: string, errorMessage?: string): Promise<EmailNotification> {
    // Email notifications feature - stub implementation
    return { id, deliveryStatus: status, errorMessage } as EmailNotification;
  }

  async checkNotificationSent(clientId: string, notificationType: string, withinHours?: number): Promise<boolean> {
    // Email notifications feature - return false for now
    return false;
  }

  // Email notification statistics
  async getEmailNotificationStats(dateFrom?: Date, dateTo?: Date): Promise<{ totalSent: number; delivered: number; failed: number; pending: number; byType: Record<string, { sent: number; delivered: number; failed: number; }>; }> {
    // Email notifications feature - return empty stats
    return {
      totalSent: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
      byType: {}
    };
  }
}

// Export a singleton instance
export const supabaseStorage = new SupabaseStorage();
