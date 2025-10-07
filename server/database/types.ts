export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      admins: {
        Row: {
          id: string;
          username: string;
          email: string;
          password: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          email: string;
          password: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          email?: string;
          password?: string;
          created_at?: string;
        };
      };
      clients: {
        Row: {
          id: string;
          name: string;
          contact_email: string;
          auth_email: string | null;
          password_hash: string | null;
          industry: string | null;
          description: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact_email: string;
          auth_email?: string | null;
          password_hash?: string | null;
          industry?: string | null;
          description?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          contact_email?: string;
          auth_email?: string | null;
          password_hash?: string | null;
          industry?: string | null;
          description?: string | null;
          status?: string;
          created_at?: string;
        };
      };
      chatbots: {
        Row: {
          id: string;
          client_id: string;
          name: string;
          description: string | null;
          config: Json;
          widget_url: string;
          status: string;
          message_count: number;
          response_rate: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          name: string;
          description?: string | null;
          config?: Json;
          widget_url: string;
          status?: string;
          message_count?: number;
          response_rate?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          name?: string;
          description?: string | null;
          config?: Json;
          widget_url?: string;
          status?: string;
          message_count?: number;
          response_rate?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          client_id: string;
          chatbot_id: string | null;
          type: string;
          status: string;
          trial_start: string | null;
          trial_end: string | null;
          paid_until: string | null;
          monthly_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          chatbot_id?: string | null;
          type: string;
          status: string;
          trial_start?: string | null;
          trial_end?: string | null;
          paid_until?: string | null;
          monthly_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          chatbot_id?: string | null;
          type?: string;
          status?: string;
          trial_start?: string | null;
          trial_end?: string | null;
          paid_until?: string | null;
          monthly_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      payment_logs: {
        Row: {
          id: string;
          client_id: string;
          subscription_id: string | null;
          amount: number;
          currency: string;
          status: string;
          failure_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          subscription_id?: string | null;
          amount: number;
          currency?: string;
          status: string;
          failure_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          subscription_id?: string | null;
          amount?: number;
          currency?: string;
          status?: string;
          failure_reason?: string | null;
          created_at?: string;
        };
      };
      widget_analytics: {
        Row: {
          id: string;
          chatbot_id: string;
          views: number;
          interactions: number;
          date: string;
        };
        Insert: {
          id?: string;
          chatbot_id: string;
          views?: number;
          interactions?: number;
          date?: string;
        };
        Update: {
          id?: string;
          chatbot_id?: string;
          views?: number;
          interactions?: number;
          date?: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          client_id: string;
          chatbot_id: string;
          title: string;
          description: string | null;
          start_time: string;
          end_time: string;
          status: string;
          external_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          chatbot_id: string;
          title: string;
          description?: string | null;
          start_time: string;
          end_time: string;
          status?: string;
          external_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          chatbot_id?: string;
          title?: string;
          description?: string | null;
          start_time?: string;
          end_time?: string;
          status?: string;
          external_id?: string | null;
          created_at?: string;
        };
      };
      leads: {
        Row: {
          id: string;
          client_id: string;
          chatbot_id: string;
          conversation_id: string | null;
          name: string | null;
          email: string | null;
          phone: string | null;
          message: string | null;
          notes: string | null;
          source: string;
          status: string;
          captured_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          chatbot_id: string;
          conversation_id?: string | null;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          message?: string | null;
          notes?: string | null;
          source?: string;
          status?: string;
          captured_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          chatbot_id?: string;
          conversation_id?: string | null;
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          message?: string | null;
          notes?: string | null;
          source?: string;
          status?: string;
          captured_at?: string;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          client_id: string;
          chatbot_id: string;
          session_id: string;
          started_at: string;
          last_message_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          chatbot_id: string;
          session_id: string;
          started_at?: string;
          last_message_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          chatbot_id?: string;
          session_id?: string;
          started_at?: string;
          last_message_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: string;
          content: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: string;
          content: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: string;
          content?: string;
          metadata?: Json;
          created_at?: string;
        };
      };
      kb_documents: {
        Row: {
          id: string;
          chatbot_id: string;
          filename: string;
          content_type: string;
          size: number;
          storage_path: string;
          status: string;
          checksum: string;
          version: number;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          chatbot_id: string;
          filename: string;
          content_type: string;
          size: number;
          storage_path: string;
          status?: string;
          checksum: string;
          version?: number;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          chatbot_id?: string;
          filename?: string;
          content_type?: string;
          size?: number;
          storage_path?: string;
          status?: string;
          checksum?: string;
          version?: number;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      kb_chunks: {
        Row: {
          id: string;
          document_id: string;
          chatbot_id: string;
          chunk_index: number;
          text: string;
          token_count: number;
          embedding: number[] | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          chatbot_id: string;
          chunk_index: number;
          text: string;
          token_count: number;
          embedding?: number[] | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          chatbot_id?: string;
          chunk_index?: number;
          text?: string;
          token_count?: number;
          embedding?: number[] | null;
          metadata?: Json;
          created_at?: string;
        };
      };
      email_settings: {
        Row: {
          id: string;
          notification_type: string;
          enabled: boolean;
          trigger_days: number | null;
          from_email: string;
          from_name: string;
          reply_to_email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          notification_type: string;
          enabled?: boolean;
          trigger_days?: number | null;
          from_email?: string;
          from_name?: string;
          reply_to_email?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          notification_type?: string;
          enabled?: boolean;
          trigger_days?: number | null;
          from_email?: string;
          from_name?: string;
          reply_to_email?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      email_notifications: {
        Row: {
          id: string;
          client_id: string;
          subscription_id: string | null;
          notification_type: string;
          recipient_email: string;
          subject: string;
          template_data: Json;
          delivery_status: string;
          message_id: string | null;
          error_message: string | null;
          sent_at: string | null;
          delivered_at: string | null;
          scheduled_for: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          subscription_id?: string | null;
          notification_type: string;
          recipient_email: string;
          subject: string;
          template_data?: Json;
          delivery_status?: string;
          message_id?: string | null;
          error_message?: string | null;
          sent_at?: string | null;
          delivered_at?: string | null;
          scheduled_for?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          subscription_id?: string | null;
          notification_type?: string;
          recipient_email?: string;
          subject?: string;
          template_data?: Json;
          delivery_status?: string;
          message_id?: string | null;
          error_message?: string | null;
          sent_at?: string | null;
          delivered_at?: string | null;
          scheduled_for?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      kb_chunks_with_documents: {
        Row: {
          id: string;
          document_id: string;
          chatbot_id: string;
          chunk_index: number;
          text: string;
          token_count: number;
          embedding: number[] | null;
          metadata: Json;
          created_at: string;
          filename: string;
          content_type: string;
          storage_path: string;
          document_status: string;
        };
      };
    };
    Functions: {
      update_updated_at_column: {
        Args: Record<string, never>;
        Returns: unknown;
      };
    };
  };
}
