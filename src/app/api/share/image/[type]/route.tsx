import { NextRequest } from "next/server";
import { publicConfig } from "@/config/public-config";
import { INVADER_SPRITES } from "@/features/app/engine/sprites";
import {
  getShareImageResponse,
  parseNextRequestSearchParams,
} from "@/neynar-farcaster-sdk/nextjs";

// Cache for 1 hour - query strings create separate cache entries
export const revalidate = 3600;

const { appEnv, heroImageUrl, imageUrl } = publicConfig;

const showDevWarning = appEnv !== "production";

const RASTA = ["#ef4444", "#FFD700", "#22c55e"];

/** Sprite 8x8 desenhado com divs (o renderer de OG não tem canvas). */
function Invader({
  type,
  color,
  px,
}: {
  type: number;
  color: string;
  px: number;
}) {
  const rows = INVADER_SPRITES[type][0];
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {rows.map((row, r) => (
        <div key={r} style={{ display: "flex" }}>
          {row.split("").map((c, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                width: px,
                height: px,
                backgroundColor: c === "X" ? color : "transparent",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 14,
          color: "#22c55e",
          letterSpacing: 3,
          fontWeight: "bold",
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 34,
          color: "#ffffff",
          fontWeight: "bold",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;

  const searchParams = parseNextRequestSearchParams(request);
  const score = searchParams.score ?? "";
  const username = searchParams.username ?? "";
  const rank = (searchParams.rank ?? "").slice(0, 20);
  const wave = searchParams.wave ?? "";
  const lines = searchParams.lines ?? "";
  const invaders = searchParams.invaders ?? "";
  const scoreNum = parseInt(score, 10);
  const hasScore = Number.isFinite(scoreNum) && scoreNum > 0;

  return getShareImageResponse(
    { type, heroImageUrl, imageUrl, showDevWarning },
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        backgroundColor: "#0d1a0d",
        position: "relative",
      }}
    >
      {/* Rasta stripes */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 12,
        }}
      >
        {RASTA.map((c) => (
          <div
            key={c}
            style={{ display: "flex", flex: 1, backgroundColor: c }}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 12,
        }}
      >
        {[...RASTA].reverse().map((c) => (
          <div
            key={c}
            style={{ display: "flex", flex: 1, backgroundColor: c }}
          />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 26,
          backgroundColor: "rgba(0,0,0,0.5)",
          borderRadius: 28,
          padding: "40px 64px",
          border: "3px solid rgba(255,215,0,0.55)",
          boxShadow:
            "0 0 60px rgba(255,215,0,0.15), 0 16px 48px rgba(0,0,0,0.6)",
        }}
      >
        {/* Invaders */}
        <div style={{ display: "flex", gap: 28 }}>
          <Invader type={0} color="#ef4444" px={7} />
          <Invader type={1} color="#FFD700" px={7} />
          <Invader type={2} color="#22c55e" px={7} />
        </div>

        {/* Logo em texto, letras rasta */}
        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: "bold",
            letterSpacing: 8,
          }}
        >
          {"RASTETRIS".split("").map((ch, i) => (
            <div key={i} style={{ display: "flex", color: RASTA[i % 3] }}>
              {ch}
            </div>
          ))}
        </div>

        {hasScore ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            {rank ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  color: "#FFD700",
                  letterSpacing: 5,
                  fontWeight: "bold",
                  textTransform: "uppercase",
                }}
              >
                {rank}
              </div>
            ) : (
              <div style={{ display: "flex" }} />
            )}
            <div
              style={{
                display: "flex",
                fontSize: 96,
                fontWeight: "bold",
                color: "white",
                lineHeight: 1,
                textShadow: "0 4px 16px rgba(0,0,0,0.5)",
              }}
            >
              {scoreNum.toLocaleString("en-US")}
            </div>
            <div style={{ display: "flex", gap: 44, marginTop: 6 }}>
              {wave ? (
                <Stat label="WAVE" value={wave} />
              ) : (
                <div style={{ display: "flex" }} />
              )}
              {lines ? (
                <Stat label="LINES" value={lines} />
              ) : (
                <div style={{ display: "flex" }} />
              )}
              {invaders ? (
                <Stat label="INVADERS" value={invaders} />
              ) : (
                <div style={{ display: "flex" }} />
              )}
            </div>
            {username ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                by {username}
              </div>
            ) : (
              <div style={{ display: "flex" }} />
            )}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: "rgba(255,255,255,0.75)",
              letterSpacing: 2,
            }}
          >
            Stack the blocks. Shoot the invaders.
          </div>
        )}
      </div>
    </div>,
  );
}
