"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type LinkState = { ok: boolean; message: string };

export async function requestLink(
  _prev: LinkState,
  formData: FormData,
): Promise<LinkState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { ok: false, message: "Enter your email address." };

  const heads = await headers();
  const host =
    heads.get("x-forwarded-host") ??
    heads.get("host") ??
    "localhost:3000";
  const protocol =
    heads.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${protocol}://${host}/auth/callback`,
    },
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Check your email for a link." };
}
