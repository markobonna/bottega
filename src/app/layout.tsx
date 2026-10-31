import type { Metadata, Viewport } from "next";
import { Caveat, IM_Fell_English, Karla } from "next/font/google";
import type { ReactNode } from "react";
import TalkBarMount from "@/components/design/TalkBarMount";
import TopBar from "@/components/TopBar";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

// The design's faces, used everywhere.
const fell = IM_Fell_English({
  variable: "--font-fell",
  subsets: ["latin"],
  weight: "400",
});
const karla = Karla({ variable: "--font-karla", subsets: ["latin"] });
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "Bottega",
  description: "A workshop that builds your projects with you.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#f3e9d2",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="en"
      className={`${fell.variable} ${karla.variable} ${caveat.variable}`}
    >
      <body className="font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-[8px] focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        {user && <TopBar email={user.email ?? null} />}
        <main
          id="main"
          className={`gutter mx-auto max-w-[1180px] pt-5 ${user ? "pb-[calc(var(--talk-h)+24px)]" : "pb-24"}`}
        >
          {children}
        </main>
        {user && <TalkBarMount />}
      </body>
    </html>
  );
}
