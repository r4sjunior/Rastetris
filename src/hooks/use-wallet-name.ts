"use client";
// src/hooks/use-wallet-name.ts
// Resolve o nome de exibição de uma carteira na prioridade:
//   1. ENS (.eth) — resolvido na Ethereum Mainnet
//   2. Base name (.base.eth) — resolvido na Base
//   3. Endereço encurtado (fallback)
//
// ENS e Base names NÃO existem na Celo, então resolvemos via RPC público
// das redes corretas (Ethereum / Base), em paralelo, com cache em memória.

import { useEffect, useState } from "react";

const cache = new Map<string, string>();

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// Resolve ENS reverse (address -> name) via API pública do ENS
async function resolveENS(address: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.ensideas.com/ens/resolve/${address}`);
    if (!res.ok) return null;
    const data = await res.json();
    // ensideas retorna { name, displayName, ... }
    if (data?.name && typeof data.name === "string") return data.name;
    return null;
  } catch {
    return null;
  }
}

// Resolve Base name (basename) via API pública da Base
async function resolveBase(address: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://resolver-api.basename.app/v1/addresses/${address}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.name && typeof data.name === "string") return data.name;
    return null;
  } catch {
    return null;
  }
}

export function useWalletName(address?: string | null): string {
  const [name, setName] = useState<string>(address ? short(address) : "");

  useEffect(() => {
    if (!address) { setName(""); return; }

    const key = address.toLowerCase();
    if (cache.has(key)) { setName(cache.get(key)!); return; }

    // valor inicial = endereço curto
    setName(short(address));

    let cancelled = false;
    (async () => {
      // 1. ENS primeiro
      const ens = await resolveENS(address);
      if (cancelled) return;
      if (ens) { cache.set(key, ens); setName(ens); return; }

      // 2. Base name
      const base = await resolveBase(address);
      if (cancelled) return;
      if (base) { cache.set(key, base); setName(base); return; }

      // 3. fallback já está setado (endereço curto)
      cache.set(key, short(address));
    })();

    return () => { cancelled = true; };
  }, [address]);

  return name;
}
