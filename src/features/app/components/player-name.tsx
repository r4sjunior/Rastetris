"use client";
// src/features/app/components/player-name.tsx
// Exibe o nome do jogador resolvendo ENS → Base → endereço.

import { useWalletName } from "@/hooks/use-wallet-name";

type Props = {
  address: `0x${string}`;
  fid?: bigint;
  color: string;
  suffix?: string;
};

export function PlayerName({ address, fid, color, suffix }: Props) {
  const name = useWalletName(address);
  // Se tem FID do Farcaster, prioriza-o como identidade social
  const display = fid && fid > 0n ? `FID ${fid}` : name;
  return (
    <span style={{ fontFamily: "'Press Start 2P', monospace", color }}>
      {display}
      {suffix ?? ""}
    </span>
  );
}
