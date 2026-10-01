"use client";
// src/features/app/components/asset-pay-widget.tsx
// Widget de pagamento com seletor de ativo (CELO / USDC / USDT).
// Reutilizado para MINT (0.01) e CONTINUE (0.05).

import { useState, useEffect } from "react";
import { useCeloPay, PayAction } from "@/hooks/use-celo-pay";
import { PayAsset, CONTRACT_DEPLOYED } from "@/lib/celo-config";

const F = "'Press Start 2P', monospace";

type Props = {
  action: PayAction;
  label: string; // texto do botão principal
  price: string; // "0.01" ou "0.05"
  accent: string; // cor de destaque
  fid?: number;
  score?: number;
  level?: number;
  onSuccess?: () => void; // chamado quando a tx confirma
};

const ASSETS: PayAsset[] = ["CELO", "USDC", "USDT"];

export function AssetPayWidget({
  action,
  label,
  price,
  accent,
  fid = 0,
  score = 0,
  level = 0,
  onSuccess,
}: Props) {
  const { status, txHash, error, pay, reset } = useCeloPay({
    action,
    fid,
    score,
    level,
  });
  const [picking, setPicking] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (status === "success" && !done) {
      setDone(true);
      onSuccess?.();
    }
  }, [status, done, onSuccess]);

  if (!CONTRACT_DEPLOYED) {
    return (
      <div
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "10px",
          border: `1px dashed ${accent}`,
          background: "rgba(0,0,0,.3)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
        }}
      >
        <span style={{ fontFamily: F, fontSize: "8px", color: accent }}>
          {label}
        </span>
        <span style={{ fontFamily: F, fontSize: "5px", color: "#4a7a4a" }}>
          disponível após deploy
        </span>
      </div>
    );
  }

  const busy = [
    "connecting",
    "switching",
    "approving",
    "confirming",
    "pending",
  ].includes(status);
  const busyLabels: Record<string, string> = {
    connecting: "⏳ Conectando...",
    switching: "⏳ Trocando rede...",
    approving: "⏳ Aprovando...",
    confirming: "⏳ Confirme na carteira...",
    pending: "⏳ Processando...",
  };

  if (status === "success") {
    return (
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        <div
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "12px",
            border: "2px solid #FFD700",
            background: "linear-gradient(135deg,#FFD700,#b8860b)",
            color: "#fff",
            fontSize: "9px",
            fontFamily: F,
            textAlign: "center",
            minHeight: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✅ {action === "mint" ? "SCORE REGISTRADO!" : "CONTINUE LIBERADO!"}
        </div>
        {txHash && (
          <a
            href={`https://celoscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: F,
              fontSize: "6px",
              color: "#FFD700",
              textAlign: "center",
              textDecoration: "underline",
            }}
          >
            Ver no Celoscan ↗
          </a>
        )}
      </div>
    );
  }

  if (busy) {
    return (
      <div
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.06)",
          color: "#fff",
          fontSize: "9px",
          fontFamily: F,
          textAlign: "center",
          minHeight: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.8,
        }}
      >
        {busyLabels[status] ?? "⏳..."}
      </div>
    );
  }

  if (picking) {
    return (
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        <div
          style={{
            fontFamily: F,
            fontSize: "7px",
            color: "#a3c4a3",
            textAlign: "center",
          }}
        >
          {label} · pague com:
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "6px",
          }}
        >
          {ASSETS.map((asset) => (
            <button
              key={asset}
              onClick={() => {
                setPicking(false);
                setDone(false);
                void pay(asset);
              }}
              style={{
                padding: "10px 4px",
                borderRadius: "10px",
                border: `1px solid ${asset === "CELO" ? "#FFD700" : accent}`,
                background:
                  asset === "CELO"
                    ? "rgba(255,215,0,0.12)"
                    : "rgba(34,197,94,0.10)",
                color: asset === "CELO" ? "#FFD700" : accent,
                fontSize: "8px",
                fontFamily: F,
                cursor: "pointer",
                minHeight: "44px",
              }}
            >
              {asset}
              <div style={{ fontSize: "5px", marginTop: "3px", opacity: 0.85 }}>
                {price}
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={() => setPicking(false)}
          style={{
            fontFamily: F,
            fontSize: "6px",
            background: "transparent",
            border: "1px solid #2d5a2d",
            color: "#a3c4a3",
            borderRadius: "8px",
            padding: "6px",
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        {status === "error" && error && (
          <p
            style={{
              fontFamily: F,
              fontSize: "6px",
              color: "#ef4444",
              textAlign: "center",
              margin: 0,
            }}
          >
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      }}
    >
      <button
        onClick={() => {
          reset();
          setDone(false);
          setPicking(true);
        }}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "12px",
          border:
            status === "error" ? "1px solid #ef4444" : `1px solid ${accent}`,
          background:
            status === "error"
              ? "linear-gradient(135deg,#ef4444,#b91c1c)"
              : action === "continue"
                ? `linear-gradient(135deg, ${accent}, #15803d)`
                : "rgba(34,197,94,0.12)",
          color: "#fff",
          fontSize: "9px",
          fontFamily: F,
          cursor: "pointer",
          minHeight: "44px",
        }}
      >
        {status === "error" ? "❌ Tentar novamente" : label}
      </button>
      <p
        style={{
          fontFamily: F,
          fontSize: "6px",
          color: "#a3c4a3",
          textAlign: "center",
          margin: 0,
          lineHeight: 1.8,
        }}
      >
        {status === "error" && error ? error : `${price} · CELO, USDC ou USDT`}
      </p>
    </div>
  );
}
