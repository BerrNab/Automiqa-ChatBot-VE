// Re-export Supabase auth middleware
export { 
  requireAdminAuth, 
  requireClientAuth, 
  verifySupabaseAuth as requireAuth,
  optionalSupabaseAuth as optionalAuth 
} from "./supabase-auth.js";
