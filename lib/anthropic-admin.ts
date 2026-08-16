// Server-only. Calls Anthropic's Admin API (Usage & Cost reporting) —
// completely separate from lib/anthropic.ts, which uses a normal API key
// to make chat-completion calls. This file uses a different credential
// (ANTHROPIC_ADMIN_API_KEY, starts with sk-ant-admin...) that can ONLY
// read organization-wide usage/cost data — it can't make chat completions,
// and the regular key can't read usage data. See the walkthrough in the
// message accompanying Batch 13 for how Dan gets this key.
//
// IMPORTANT CAVEAT: this was written against Anthropic's documented
// request/response shapes (docs.claude.com), but has not been exercised
// against a real Admin API key or real response payload — there was no
// credential available to test against while building this. The date
// range / grouping logic should be solid, but if the exact JSON field
// names below don't match what the live API actually returns, the fix is
// almost certainly just adjusting the parsing in `sumCostReport` /
// `sumUsageReport`, not the overall approach.

const ADMIN_API_BASE = "https://api.anthropic.com/v1/organizations";
const ANTHROPIC_VERSION = "2023-06-01";

export function isAdminApiConfigured(): boolean {
  return !!process.env.ANTHROPIC_ADMIN_API_KEY;
}

async function adminFetch(path: string, params: Record<string, string | string[]>) {
  const key = process.env.ANTHROPIC_ADMIN_API_KEY;
  if (!key) {
    throw new Error(
      "ANTHROPIC_ADMIN_API_KEY is not set — see README Batch 13 for how to get one."
    );
  }

  const url = new URL(`${ADMIN_API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) {
      for (const item of v) url.searchParams.append(`${k}[]`, item);
    } else {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      "anthropic-version": ANTHROPIC_VERSION,
      "x-api-key": key,
    },
    // Usage/cost data doesn't need to be realtime — cache briefly so the
    // super-admin usage page doesn't hit the Admin API on every render.
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anthropic Admin API ${path} failed: ${res.status} ${body}`);
  }

  return res.json();
}

export interface OrgCostSummary {
  totalUsd: number;
  byDescription: { label: string; usd: number }[];
  periodStart: string;
  periodEnd: string;
}

// Cost report — /v1/organizations/cost_report. Costs come back as decimal
// strings in the lowest currency unit (cents), grouped by workspace or
// description. We group by description here since that's the more
// human-readable breakdown (includes model name).
export async function getOrgCostSummary(daysBack = 30): Promise<OrgCostSummary> {
  const endingAt = new Date();
  const startingAt = new Date(endingAt.getTime() - daysBack * 24 * 60 * 60 * 1000);

  const data = await adminFetch("/cost_report", {
    starting_at: startingAt.toISOString(),
    ending_at: endingAt.toISOString(),
    group_by: ["description"],
  });

  const byDescription = new Map<string, number>();
  let totalCents = 0;

  // Defensive parsing: the API returns time-bucketed results, each with
  // its own array of cost entries. Walk whatever shape comes back rather
  // than assuming one fixed nesting.
  const buckets = Array.isArray(data?.data) ? data.data : [];
  for (const bucket of buckets) {
    const results = Array.isArray(bucket?.results) ? bucket.results : [];
    for (const entry of results) {
      const cents = Number(entry?.amount ?? 0);
      if (!Number.isFinite(cents)) continue;
      totalCents += cents;
      const label = entry?.description ?? entry?.model ?? "其他";
      byDescription.set(label, (byDescription.get(label) ?? 0) + cents);
    }
  }

  return {
    totalUsd: totalCents / 100,
    byDescription: Array.from(byDescription.entries())
      .map(([label, cents]) => ({ label, usd: cents / 100 }))
      .sort((a, b) => b.usd - a.usd),
    periodStart: startingAt.toISOString(),
    periodEnd: endingAt.toISOString(),
  };
}
