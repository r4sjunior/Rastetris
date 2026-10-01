import "@/app/globals.css";
import { ThemeClient } from "@/components/theme-client";
import { ProvidersAndInitialization } from "@/features/app/providers-and-initialization";
import { Caveat, Geist, Geist_Mono, Patrick_Hand } from "next/font/google";
import { ReactNode } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const patrickHand = Patrick_Hand({
  variable: "--font-patrick-hand",
  subsets: ["latin"],
  weight: "400",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* ✅ META TAG */}
        <meta
          name="talentapp:project_verification"
          content="9db0e048c7d9a92f78dbcad23bf4b5e6ab79077300f82c2c9ea3909605be8ebd41cda62ce97531535dad214364f92b3da46b103a0bf46525f84bd1efe24e1ee0"
        />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />

        <ThemeClient />
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} ${patrickHand.variable} antialiased bg-black flex items-center justify-center min-h-dvh`}
      >
        {/* 🔥 CONTAINER MINI APP FIXO */}
        <div className="w-full max-w-[640px] min-h-dvh bg-black shadow-2xl overflow-hidden rounded-none md:rounded-2xl">
          <ProvidersAndInitialization>{children}</ProvidersAndInitialization>
        </div>
      </body>
    </html>
  );
}
