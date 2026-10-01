"use client";

import { ReactNode, useState } from "react";
import { Provider as JotaiProvider } from "jotai";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import {
  InitializeFarcasterMiniApp,
  useInitializeFarcasterApp,
} from "@/neynar-farcaster-sdk/mini";
import { Toaster } from "@neynar/ui";
import { wagmiConfig } from "@/lib/celo-config";

// ⚠️ ORDEM CORRETA para wagmi v2:
// QueryClientProvider → WagmiProvider → resto dos providers

export function ProvidersAndInitialization({
  children,
}: {
  children: ReactNode;
}) {
  useInitializeFarcasterApp();
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <JotaiProvider>
          {/* LLMs: Add additional providers between here */}
          <Toaster position="top-center" richColors />
          {/* and here */}
          {/* LLMs: Do not remove, initialization must be last, before children */}
          <InitializeFarcasterMiniApp />
          {children}
          {/* End Do not remove */}
        </JotaiProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
