// Local only: mint a magic link for a demo account without sending email.
// Usage: pnpm run login-link -- maria@example.com [baseUrl]
// Needs the real SUPABASE_SECRET_KEY in .env.local (vercel env pull redacts
// it, so paste it in by hand; never commit it).

import { createAdminClient } from "@/lib/supabase/admin";

async function main(): Promise<void> {
  // Node keeps a bare `--` in argv, so strip it: both
  // `pnpm run login-link -- a@b.c` and `... login-link a@b.c` work.
  const [email, baseUrl = "http://localhost:3000"] = process.argv
    .slice(2)
    .filter((a) => a !== "--");

  if (!email) {
    console.error("usage: pnpm run login-link -- <email> [baseUrl]");
    process.exit(1);
  }

  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret || secret.startsWith("[")) {
    console.error(
      "SUPABASE_SECRET_KEY is missing or redacted in .env.local. Paste the real " +
        "secret from the Supabase dashboard (Project Settings → API keys) and rerun.",
    );
    process.exit(1);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${baseUrl}/auth/callback` },
  });

  const link = data?.properties?.action_link;
  if (error || !link) {
    console.error(`login-link failed: ${error?.message ?? "no link returned"}`);
    process.exit(1);
  }
  console.log(link);
}

main().catch((err: unknown) => {
  console.error(`login-link failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
