// src/lib/platform-detect.ts

type Platform = "minipay" | "farcaster" | "browser";

type EthereumProvider = {
  isMiniPay?: boolean;
  isMetaMask?: boolean;
  request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export function getEthereum(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { ethereum?: EthereumProvider }).ethereum;
}

export function isMiniPay(): boolean {
  return Boolean(getEthereum()?.isMiniPay);
}

export function detectPlatform(): Platform {
  if (typeof window === "undefined") return "browser";
  const eth = getEthereum();
  if (eth?.isMiniPay) return "minipay";
  const w = window as unknown as { __farcaster?: unknown };
  const inIframe = window.self !== window.top;
  if (w.__farcaster || (inIframe && navigator.userAgent.includes("Warpcast"))) return "farcaster";
  return "browser";
}
