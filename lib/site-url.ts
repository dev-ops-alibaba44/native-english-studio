import { headers } from "next/headers";

// Batch 25 tried an env-var-first approach here and it bit Dan again in
// Batch 26 testing: NEXT_PUBLIC_SITE_URL is a NEXT_PUBLIC_-prefixed
// variable, which Next.js inlines into the compiled bundle AT BUILD
// TIME — adding or changing it in the Vercel dashboard does nothing to
// an already-built deployment until a fresh build actually runs. Dan
// had set it correctly in Vercel's env vars, but the invite link still
// came back pointing at localhost, because the deployment serving that
// request had been built before the env var was added.
//
// Rather than depend on Dan remembering to trigger a redeploy every
// time this env var changes (or explaining that footgun in a README
// note that's easy to miss), this now ALWAYS derives the origin from
// the incoming request's own headers — correct by construction in every
// environment (local dev, preview deploys, production) on every single
// request, with no build-time dependency and no configuration to get
// out of sync. There's deliberately no env var override anymore; if a
// genuinely unusual proxy setup ever needs one, that's a deliberate
// code change to make here, not a dashboard setting someone can forget.
export async function getSiteUrl(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host") || "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

