import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // Permite imagens de perfil (avatares ENS / Base) e blobs do projeto
    remotePatterns: [
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "remix.gg" },
      { protocol: "https", hostname: "metadata.ens.domains" },
      { protocol: "https", hostname: "**.basename.app" },
      { protocol: "https", hostname: "ipfs.io" },
      { protocol: "https", hostname: "**.ipfs.dweb.link" },
    ],
  },
};

export default nextConfig;
