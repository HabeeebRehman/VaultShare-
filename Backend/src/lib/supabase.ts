import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";

/**
 * Server-side Supabase client using the service-role key.
 * Used for: storing secret *metadata* (never the secret itself),
 * recording contact submissions, and looking up user emails.
 *
 * NOTE: the service key bypasses Row Level Security, so this client
 * must only ever run on the backend.
 */
export const supabase = createClient(
  config.supabaseUrl,
  config.supabaseServiceKey,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);
