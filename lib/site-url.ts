import { headers } from "next/headers";

// Batch 25: fixes invite/reset-password/etc. links pointing at
// localhost:3000 when sent from the deployed site (see the README entry
// for item 4 in Dan's Batch 25 report — clicking the invite link in an
// email sent from nativeenglish.ca landed on localhost and crashed).
//
// The old approach hardcoded NEXT_PUBLIC_SITE_URL with a localhost
// fallback — correct only if that env var was actually set on Vercel,
// which it wasn't. Deriving the origin from the incoming request's own
// headers instead means this is correct automatically in every
// environment (local dev, preview deploys, production) with zero
// configuration, since it's always describing wherever this code is
// actually running right now. NEXT_PUBLIC_SITE_URL is still honored as
// an explicit override, for the rare case (e.g. behind an unusual proxy
// setup) where the header-based guess isn't right.
export async function getSiteUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host") || "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}
