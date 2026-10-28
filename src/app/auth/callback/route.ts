import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

const FAILED = "That link didn't work. Send a new one.";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  const failure = (origin: string) =>
    NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(FAILED)}`,
    );

  if (!code) return failure(url.origin);

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The proxy refreshes the session when cookie writes fail here.
          }
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return failure(url.origin);

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal =
    url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (!isLocal && forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`);
  }
  return NextResponse.redirect(`${url.origin}${next}`);
}
