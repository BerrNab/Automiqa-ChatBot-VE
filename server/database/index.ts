import { supabase, supabaseAdmin } from './supabase.js';
import { nanoid } from 'nanoid';

// Generic database service with common CRUD operations
export class DatabaseService<T> {
  constructor(private tableName: string) {}

  // Create a new record
  async create(data: any): Promise<T> {
    const { data: result, error } = await supabaseAdmin
      .from(this.tableName)
      .insert(data)
      .select()
      .single();
    
    if (error) {
      console.error(`Error creating ${this.tableName}:`, error);
      throw new Error(`Failed to create ${this.tableName}: ${error.message}`);
    }
    
    return result as T;
  }

  // Get a record by ID
  async getById(id: string): Promise<T | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // Record not found
        return null;
      }
      console.error(`Error fetching ${this.tableName} by ID:`, error);
      throw new Error(`Failed to fetch ${this.tableName}: ${error.message}`);
    }
    
    return data as T;
  }

  // Get all records
  async getAll(): Promise<T[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*');
    
    if (error) {
      console.error(`Error fetching all ${this.tableName}:`, error);
      throw new Error(`Failed to fetch ${this.tableName} records: ${error.message}`);
    }
    
    return data as T[];
  }

  // Update a record
  async update(id: string, data: Partial<T>): Promise<T> {
    const { data: result, error } = await supabaseAdmin
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating ${this.tableName}:`, error);
      throw new Error(`Failed to update ${this.tableName}: ${error.message}`);
    }
    
    return result as T;
  }

  // Delete a record
  async delete(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from(this.tableName)
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting ${this.tableName}:`, error);
      throw new Error(`Failed to delete ${this.tableName}: ${error.message}`);
    }
  }

  // Query with filters
  async query(filters: Record<string, any>, options: { 
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
  } = {}): Promise<T[]> {
    let query = supabase
      .from(this.tableName)
      .select('*');
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });
    
    // Apply ordering
    if (options.orderBy) {
      const direction = options.orderDirection || 'asc';
      query = query.order(options.orderBy, { ascending: direction === 'asc' });
    }
    
    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error(`Error querying ${this.tableName}:`, error);
      throw new Error(`Failed to query ${this.tableName}: ${error.message}`);
    }
    
    return data as T[];
  }

  // Generate a unique ID (useful for creating new records)
  generateId(): string {
    return nanoid();
  }
}

// Export specific database services for each table
export const adminService = new DatabaseService('admins');
export const clientService = new DatabaseService('clients');
export const chatbotService = new DatabaseService('chatbots');
export const subscriptionService = new DatabaseService('subscriptions');
export const paymentLogService = new DatabaseService('payment_logs');
export const widgetAnalyticsService = new DatabaseService('widget_analytics');
export const appointmentService = new DatabaseService('appointments');
export const leadService = new DatabaseService('leads');
export const conversationService = new DatabaseService('conversations');
export const messageService = new DatabaseService('messages');
export const kbDocumentService = new DatabaseService('kb_documents');
export const kbChunkService = new DatabaseService('kb_chunks');
export const emailSettingsService = new DatabaseService('email_settings');
export const emailNotificationService = new DatabaseService('email_notifications');
