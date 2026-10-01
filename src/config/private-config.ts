import "server-only";
import { z } from "zod";

const privateConfigSchema = z.object({
  // Opcional no build: a chave só é necessária em runtime pelas rotas /api/neynar
  neynarApiKey: z.string(),
  coingeckoApiKey: z.string(),
});

export const privateConfig = privateConfigSchema.parse({
  neynarApiKey: process.env.NEYNAR_API_KEY || "",
  coingeckoApiKey:
    // demo coingecko key, not sensitive
    process.env.COINGECKO_API_KEY || "CG-UviYfmkExfr86X5JFTZfaVbb",
});
