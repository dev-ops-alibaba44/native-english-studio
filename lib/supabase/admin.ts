import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// SERVICE ROLE CLIENT — bypasses Row Level Security entirely.
// Only ever use this in trusted server-only code with no user session to attach
// (e.g. the Stripe webhook route, which is called by Stripe, not by a logged-in
// user). Never import this into a Server Component, Server Action triggered by a
// user request, or anything reachable from the client.
//
// Requires SUPABASE_SERVICE_ROLE_KEY — found in Supabase Dashboard →
// Project Settings → API → "service_role" secret key. Keep this out of any
// NEXT_PUBLIC_* env var.
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
