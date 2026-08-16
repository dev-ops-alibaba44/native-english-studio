"use client";

import { useState, useTransition } from "react";
import { updateLeadStatus } from "@/app/actions/super-admin";

const STATUS_OPTIONS = [
  { value: "new", label: "新進" },
  { value: "contacted", label: "已聯繫" },
  { value: "converted", label: "已成交" },
  { value: "declined", label: "婉拒／無回應" },
] as const;

export function LeadStatusSelect({
  table,
  id,
  initialStatus,
}: {
  table: "agency_inquiries" | "waitlist_signups";
  id: string;
  initialStatus: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value as (typeof STATUS_OPTIONS)[number]["value"];
        setStatus(next);
        startTransition(() => {
          updateLeadStatus(table, id, next);
        });
      }}
      className="rounded border border-line bg-surface px-2 py-1 text-xs disabled:opacity-60"
    >
      {STATUS_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
