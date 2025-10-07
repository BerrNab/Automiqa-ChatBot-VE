-- Initial schema migration for SQLite
-- This is a simplified version of the schema for development purposes

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  auth_email TEXT UNIQUE,
  password_hash TEXT,
  industry TEXT,
  description TEXT,
  status TEXT DEFAULT 'active' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create chatbots table
CREATE TABLE IF NOT EXISTS chatbots (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  config TEXT DEFAULT '{}' NOT NULL,
  widget_url TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL,
  message_count INTEGER DEFAULT 0 NOT NULL,
  response_rate INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  chatbot_id TEXT REFERENCES chatbots(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  trial_start TIMESTAMP,
  trial_end TIMESTAMP,
  paid_until TIMESTAMP,
  monthly_amount INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create payment_logs table
CREATE TABLE IF NOT EXISTS payment_logs (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd' NOT NULL,
  status TEXT NOT NULL,
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create widget_analytics table
CREATE TABLE IF NOT EXISTS widget_analytics (
  id TEXT PRIMARY KEY,
  chatbot_id TEXT NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  views INTEGER DEFAULT 0 NOT NULL,
  interactions INTEGER DEFAULT 0 NOT NULL,
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  chatbot_id TEXT NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'scheduled' NOT NULL,
  external_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  chatbot_id TEXT NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(chatbot_id, session_id)
);

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  chatbot_id TEXT NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  message TEXT,
  notes TEXT,
  source TEXT DEFAULT 'widget' NOT NULL,
  status TEXT DEFAULT 'new' NOT NULL,
  captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create kb_documents table
CREATE TABLE IF NOT EXISTS kb_documents (
  id TEXT PRIMARY KEY,
  chatbot_id TEXT NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT DEFAULT 'uploaded' NOT NULL,
  checksum TEXT NOT NULL,
  version INTEGER DEFAULT 1 NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(chatbot_id, checksum)
);

-- Create kb_chunks table (without vector support for SQLite)
CREATE TABLE IF NOT EXISTS kb_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
  chatbot_id TEXT NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  token_count INTEGER NOT NULL,
  metadata TEXT DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create email_settings table
CREATE TABLE IF NOT EXISTS email_settings (
  id TEXT PRIMARY KEY,
  notification_type TEXT NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT true NOT NULL,
  trigger_days INTEGER,
  from_email TEXT DEFAULT 'noreply@chatbotsaas.com' NOT NULL,
  from_name TEXT DEFAULT 'Chatbot SaaS' NOT NULL,
  reply_to_email TEXT DEFAULT 'support@chatbotsaas.com' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create email_notifications table
CREATE TABLE IF NOT EXISTS email_notifications (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_data TEXT DEFAULT '{}' NOT NULL,
  delivery_status TEXT DEFAULT 'pending' NOT NULL,
  message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  scheduled_for TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_contact_email ON clients(contact_email);
CREATE INDEX IF NOT EXISTS idx_clients_auth_email ON clients(auth_email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_chatbots_client_id ON chatbots(client_id);
CREATE INDEX IF NOT EXISTS idx_chatbots_status ON chatbots(status);
CREATE INDEX IF NOT EXISTS idx_chatbots_widget_url ON chatbots(widget_url);
CREATE INDEX IF NOT EXISTS idx_subscriptions_client_id ON subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_chatbot_id ON subscriptions(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payment_logs_client_id ON payment_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_subscription_id ON payment_logs(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_status ON payment_logs(status);
CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at ON payment_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_chatbot_id ON widget_analytics(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_date ON widget_analytics(date);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_chatbot_id ON appointments(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_leads_client_id ON leads(client_id);
CREATE INDEX IF NOT EXISTS idx_leads_chatbot_id ON leads(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_leads_conversation_id ON leads(conversation_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_captured_at ON leads(captured_at);
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_chatbot_id ON conversations(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_kb_documents_chatbot_id ON kb_documents(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_kb_documents_status ON kb_documents(status);
CREATE INDEX IF NOT EXISTS idx_kb_documents_checksum ON kb_documents(checksum);
CREATE INDEX IF NOT EXISTS idx_kb_chunks_document_id ON kb_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_kb_chunks_chatbot_id ON kb_chunks(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_kb_chunks_chunk_index ON kb_chunks(chunk_index);
CREATE INDEX IF NOT EXISTS idx_email_settings_notification_type ON email_settings(notification_type);
CREATE INDEX IF NOT EXISTS idx_email_settings_enabled ON email_settings(enabled);
CREATE INDEX IF NOT EXISTS idx_email_notifications_client_id ON email_notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_subscription_id ON email_notifications(subscription_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_notification_type ON email_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_email_notifications_recipient_email ON email_notifications(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_notifications_delivery_status ON email_notifications(delivery_status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_scheduled_for ON email_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_notifications_sent_at ON email_notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_notifications_created_at ON email_notifications(created_at);

-- Insert default admin user
INSERT INTO admins (id, username, email, password) 
VALUES ('admin1', 'admin', 'admin@example.com', '$2b$10$3euPcmQFCiblsZeEu5s7p.9wZZa1p1Xz7DdYZ3lhxU3J9bJ8Gw3Aq');
