import type { Metadata, Viewport } from "next";
import {
  Atkinson_Hyperlegible_Next,
  Caveat,
  Fraunces,
  IM_Fell_English,
  Karla,
} from "next/font/google";
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

// Design-prototype faces, used only inside .b-scope scenes.
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
    <html
      lang="en"
      className={`${fraunces.variable} ${atkinson.variable} ${fell.variable} ${karla.variable} ${caveat.variable}`}
    >
      <body className="font-sans">
        {user && <TopBar email={user.email ?? null} />}
        <main className="gutter mx-auto max-w-[720px] pt-5 pb-24">
          {children}
        </main>
      </body>
    </html>
  );
}
