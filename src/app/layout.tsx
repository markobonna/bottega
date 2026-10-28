import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Fraunces } from "next/font/google";
import type { ReactNode } from "react";
import TopBar from "@/components/TopBar";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
});

const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bottega",
  description: "A workshop that builds your app with you.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1e7" },
    { media: "(prefers-color-scheme: dark)", color: "#16130f" },
  ],
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
    <html lang="en" className={`${fraunces.variable} ${atkinson.variable}`}>
      <body className="font-sans">
        {user?.email && <TopBar email={user.email} />}
        <main className="gutter mx-auto max-w-[720px] pt-5 pb-24">
          {children}
        </main>
      </body>
    </html>
  );
}
