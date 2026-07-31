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
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
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
