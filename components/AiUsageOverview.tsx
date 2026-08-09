"use client";

import { useState } from "react";
import { UsageGauge } from "@/components/UsageGauge";

export interface AiUsageItem {
  key: string;
  label: string;
  used: number;
  limit: number;
  helperText: string;
}

// Batch 9.17 — Dan's feedback: three separate gauges (brainstorming /
// essay feedback / profile assessment) asks a student to keep track of
// three different numbers on three different reset schedules just to
// understand "how much AI can I still use", which is exactly the kind
// of thing this product should NOT make someone think about. This
// collapses them into one plain-language headline by default — the
// detail is still there for anyone who wants it (an advisor checking a
// specific student, or a curious student), just one tap away instead of
// presented as three gauges up front.
function overallStatus(items: AiUsageItem[]): { text: string; color: string } {
  const pcts = items.map((i) => (i.limit > 0 ? i.used / i.limit : 0));
  const worst = Math.max(...pcts, 0);
  if (worst >= 1) return { text: "本月有一項 AI 功能已達使用上限", color: "#DD0E20" };
  if (worst >= 0.8) return { text: "AI 使用量正常，其中一項即將達到上限", color: "#B8860B" };
  return { text: "AI 使用量正常", color: "#172983" };
}

export function AiUsageOverview({ items }: { items: AiUsageItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const status = overallStatus(items);

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color }} />
          <span className="font-display font-bold text-sm">{status.text}</span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-semibold text-brand hover:underline"
        >
          {expanded ? "收合" : "查看個別用量"}
        </button>
      </div>
      <p className="text-xs text-slate mt-1">
        涵蓋 AI 腦力激盪、文書 AI 回饋、AI 綜合評估三項功能，避免額度用盡時申請文書寫作被中斷。
      </p>

      {expanded && (
        <div className="flex flex-col gap-3 mt-4">
          {items.map((item) => (
            <UsageGauge key={item.key} label={item.label} used={item.used} limit={item.limit} helperText={item.helperText} />
          ))}
        </div>
      )}
    </div>
  );
}
