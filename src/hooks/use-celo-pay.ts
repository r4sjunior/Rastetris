"use client";
// src/hooks/use-celo-pay.ts
// Pagamento unificado: MINT (0.01) e CONTINUE (0.05) em CELO / USDC / USDT.

import { useState, useEffect, useRef, useCallback } from "react";
import {
  useAccount, useConnect, useChainId, useSwitchChain,
  useWriteContract, useWaitForTransactionReceipt,
} from "wagmi";
import { celo } from "viem/chains";
import {
  LEADERBOARD_ADDRESS, LEADERBOARD_ABI, ERC20_ABI, CONTRACT_DEPLOYED, CELO_PARAMS,
  MINT_CELO_WEI, CONTINUE_CELO_WEI, MINT_STABLE_6, CONTINUE_STABLE_6,
  stableBySymbol, PayAsset,
} from "@/lib/celo-config";
import { detectPlatform, getEthereum } from "@/lib/platform-detect";

export type PayAction = "mint" | "continue";
export type PayStatus =
  | "idle" | "not-deployed" | "connecting" | "switching"
  | "approving" | "confirming" | "pending" | "success" | "error";

export type PayState = {
  status: PayStatus;
  txHash?: `0x${string}`;
  error?: string;
  pay: (asset: PayAsset) => Promise<void>;
  reset: () => void;
};

type Options = { action: PayAction; fid?: number; score?: number; level?: number };

export function useCeloPay({ action, fid = 0, score = 0, level = 0 }: Options): PayState {
  const [status, setStatus] = useState<PayStatus>("idle");
  const [error, setError] = useState<string>();
  const [pendingAsset, setPendingAsset] = useState<PayAsset | null>(null);

  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { connect, connectors, error: connectError } = useConnect();
  const { switchChainAsync } = useSwitchChain();

  const chainIdRef = useRef(chainId);
  useEffect(() => { chainIdRef.current = chainId; }, [chainId]);
  const busyRef = useRef(false);

  const { writeContract, writeContractAsync, data: txHash, isPending: sending, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: pendingTx, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => { if (sending) setStatus("confirming"); }, [sending]);
  useEffect(() => { if (pendingTx) setStatus("pending"); }, [pendingTx]);
  useEffect(() => { if (isSuccess) { busyRef.current = false; setStatus("success"); } }, [isSuccess]);

  useEffect(() => {
    if (!connectError || status !== "connecting") return;
    busyRef.current = false; setError("Conexão cancelada."); setStatus("error");
  }, [connectError, status]);

  useEffect(() => {
    if (!writeError) return;
    busyRef.current = false;
    const m = (writeError.message ?? "").toLowerCase();
    if (m.includes("rejected") || m.includes("denied") || m.includes("user")) setError("Transação rejeitada.");
    else if (m.includes("insufficient")) setError("Saldo insuficiente.");
    else setError(writeError.message?.slice(0, 130) || "Erro.");
    setStatus("error");
  }, [writeError]);

  useEffect(() => {
    if (isConnected && status === "connecting" && busyRef.current && pendingAsset) void run(pendingAsset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  function pickConnector() {
    const p = detectPlatform();
    if (p === "farcaster") return connectors.find(c => c.id === "farcasterMiniApp") ?? connectors[0];
    return connectors.find(c => c.id === "injected") ?? connectors.find(c => c.id === "metaMask") ?? connectors[0];
  }

  async function ensureCelo(): Promise<boolean> {
    if (chainIdRef.current === celo.id) return true;
    setStatus("switching");
    try { await switchChainAsync({ chainId: celo.id }); return true; }
    catch {
      try {
        const eth = getEthereum();
        if (eth?.request) {
          await eth.request({ method: "wallet_addEthereumChain", params: [CELO_PARAMS] });
          await switchChainAsync({ chainId: celo.id }); return true;
        }
      } catch { /* */ }
      setError("Não foi possível trocar para a Celo."); setStatus("error"); busyRef.current = false; return false;
    }
  }

  async function run(asset: PayAsset) {
    const ok = await ensureCelo();
    if (!ok) return;

    try {
      if (asset === "CELO") {
        setStatus("confirming");
        if (action === "mint") {
          writeContract({ address: LEADERBOARD_ADDRESS, abi: LEADERBOARD_ABI, functionName: "mintScoreCELO",
            args: [BigInt(fid), BigInt(score), BigInt(level)], value: MINT_CELO_WEI, chainId: celo.id });
        } else {
          writeContract({ address: LEADERBOARD_ADDRESS, abi: LEADERBOARD_ABI, functionName: "continueCELO",
            args: [], value: CONTINUE_CELO_WEI, chainId: celo.id });
        }
        return;
      }

      // Stablecoin: approve + chamada
      const stable = stableBySymbol(asset);
      if (!stable) { setError("Token inválido."); setStatus("error"); busyRef.current = false; return; }
      const amount = action === "mint" ? MINT_STABLE_6 : CONTINUE_STABLE_6;

      setStatus("approving");
      await writeContractAsync({ address: stable.address, abi: ERC20_ABI, functionName: "approve",
        args: [LEADERBOARD_ADDRESS, amount], chainId: celo.id });
      await new Promise(r => setTimeout(r, 1500));

      setStatus("confirming");
      if (action === "mint") {
        writeContract({ address: LEADERBOARD_ADDRESS, abi: LEADERBOARD_ABI, functionName: "mintScoreStable",
          args: [BigInt(fid), BigInt(score), BigInt(level), stable.address], chainId: celo.id });
      } else {
        writeContract({ address: LEADERBOARD_ADDRESS, abi: LEADERBOARD_ABI, functionName: "continueStable",
          args: [stable.address], chainId: celo.id });
      }
    } catch (e: unknown) {
      busyRef.current = false;
      const m = e instanceof Error ? e.message.toLowerCase() : "";
      setError(m.includes("rejected") || m.includes("denied") ? "Transação rejeitada." : (e instanceof Error ? e.message.slice(0, 130) : "Erro."));
      setStatus("error");
    }
  }

  const pay = useCallback(async (asset: PayAsset) => {
    if (!CONTRACT_DEPLOYED) { setStatus("not-deployed"); return; }
    setError(undefined); resetWrite(); busyRef.current = true; setPendingAsset(asset);
    if (!isConnected) {
      setStatus("connecting");
      const c = pickConnector();
      if (!c) { setError("Nenhuma carteira."); setStatus("error"); busyRef.current = false; return; }
      connect({ connector: c });
      return;
    }
    await run(asset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, action, fid, score, level]);

  function reset() {
    busyRef.current = false; setStatus("idle"); setError(undefined); setPendingAsset(null); resetWrite();
  }

  return { status, txHash, error, pay, reset };
}
