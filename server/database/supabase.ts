import { createClient } from '@supabase/supabase-js';
import config from '../config.js';
import type { Database } from './types.js';

// Create a single supabase client for interacting with your database
const supabaseUrl = config.supabaseUrl || '';
const supabaseAnonKey = config.supabaseAnonKey || '';
const supabaseServiceKey = config.supabaseServiceKey || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration. Please check your environment variables.');
}

// Create client with anonymous key for public operations
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Create admin client with service role key for privileged operations
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);

export default supabase;
