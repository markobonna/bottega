"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Status } from "@/components/ui";

const FAILED = "That link didn't work. Send a new one.";

// Landing page for admin-minted demo links (login-link script). Supabase
// answers those with the session in the URL fragment, which browsers never
// send to servers — so this page runs in the browser, sets the session from
// the fragment, and enters. Real-email (PKCE) links keep using /auth/callback.
export default function ConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const fail = () =>
        router.replace(`/sign-in?error=${encodeURIComponent(FAILED)}`);
      const query = new URLSearchParams(window.location.search);
      if (query.get("error")) {
        fail();
        return;
      }
      const code = query.get("code");
      if (code) {
        window.location.assign(
          `/auth/callback?code=${encodeURIComponent(code)}`,
        );
        return;
      }
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (!accessToken || !refreshToken) {
        fail();
        return;
      }
      const supabase = createClient();
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        fail();
        return;
      }
      router.replace("/");
    };
    void run();
  }, [router]);

  return <Status tone="muted">Signing you in…</Status>;
}
