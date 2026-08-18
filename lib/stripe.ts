import Stripe from "stripe";

// Server-only. Never import this from a client component.
//
// IMPORTANT: this client is created LAZILY (only on first call to getStripe()),
// not at module load time. The Stripe SDK throws immediately if constructed
// with an empty API key, and this file is imported by the billing page even
// before Stripe is configured — a real crash we hit in testing. Lazy
// construction means the rest of the app (agency portal, advisor portal,
// student portal) works fine with no Stripe env vars set at all; only the
// billing page's checkout/portal actions and the webhook route need them,
// and those already check STRIPE_PRICE_LICENSE / this function's error before
// calling anything.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set — add it to .env.local before using billing features."
    );
  }
  if (!_stripe) {
    // Batch 9.20.3 fix: this literal must match the API version the
    // installed `stripe` npm package's TypeScript types were built
    // against — the Stripe Node SDK types `apiVersion` as an exact string
    // literal, not a general string, specifically so a mismatch fails to
    // compile rather than silently sending a version header the SDK
    // wasn't tested against. Before Batch 9.20.2, this project had no
    // `package-lock.json`, so `npm install`/`npm audit fix` were free to
    // resolve a newer `stripe` version than whatever this string was
    // originally written against — same root cause as the two Vercel
    // build fixes just before this one. Now that a lockfile is committed
    // (Batch 9.20.2), the installed version is pinned going forward, so
    // this shouldn't drift again on its own; only bump this string
    // deliberately, together with a `stripe` version bump, and re-run
    // `npm run build` locally to confirm they still agree.
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    });
  }
  return _stripe;
}

// Prices are configured as Products/Prices in the Stripe Dashboard (or via the
// Stripe CLI/API) rather than hardcoded here, since the annual license fee is
// negotiated per agency (see Native_English_Financial_Model.xlsx: $1,500–$2,500/yr
// range, avg $2,000). Set the resulting Price IDs as env vars:
//
//   STRIPE_PRICE_LICENSE          - annual agency license fee (recurring, yearly)
//   STRIPE_PRICE_SEAT_STANDARD    - standard seat, per student/year (recurring, yearly)
//   STRIPE_PRICE_SEAT_PREMIUM     - premium seat, per student/year (recurring, yearly)
export const STRIPE_PRICE_LICENSE = process.env.STRIPE_PRICE_LICENSE || "";
export const STRIPE_PRICE_SEAT_STANDARD = process.env.STRIPE_PRICE_SEAT_STANDARD || "";
export const STRIPE_PRICE_SEAT_PREMIUM = process.env.STRIPE_PRICE_SEAT_PREMIUM || "";

// Batch 25: cancelSeat/upgradeSeat both retrieve/modify a Stripe
// subscription item by an ID stored on the seat row (`
// stripe_subscription_item_id`). Dan hit "Customer ... does not have a
// subscription with ID ..." on every cancel/upgrade attempt in testing —
// the seat rows in the DB were pointing at Stripe subscription items
// whose parent subscription no longer exists on that customer (most
// likely from clearing Stripe test-mode data at some point while the
// Supabase rows stuck around). This is a real scenario that can recur
// any time Stripe and Supabase drift apart, not just a one-off — so
// both actions now check for this specific error shape and treat a
// vanished Stripe-side item as "already gone, nothing to do here"
// rather than crashing the whole request.
export function isStripeResourceMissing(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { type?: string; code?: string; raw?: { code?: string } };
  return e.type === "StripeInvalidRequestError" && (e.code === "resource_missing" || e.raw?.code === "resource_missing");
}
