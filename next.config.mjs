import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pins the project root explicitly — this is Next.js's own recommended
  // fix for the "Next.js package not found... workspace root" crash.
  // Without it, Turbopack tries to auto-infer the root by walking up from
  // whichever file it's currently touching, which can misfire if the dev
  // server is left running while files are being overwritten on disk
  // (e.g. applying a new batch without stopping `npm run dev` first).
  // __dirname isn't a global in .mjs (ESM) files, unlike .js/.ts with
  // CommonJS — reconstructed above via import.meta.url instead.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
