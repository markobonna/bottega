import "server-only";

import { createClient } from "@supabase/supabase-js";

// Bypasses RLS. Server-only: seed script, share page, Try-as copy, guest
// cleanup. Never import from client code.
export function createAdminClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
