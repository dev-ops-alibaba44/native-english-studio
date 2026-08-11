"use client";

import { useState } from "react";
import Link from "next/link";
import { daysRemaining } from "@/lib/deadlines";

export interface DeadlineItem {
  id: string;
  href: string;
  deadline: string; // YYYY-MM-DD
  title: string; // school name
  subtitle?: string; // student name — only set on advisor/agency views
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleString("zh-TW", { year: "numeric", month: "long" });
}

// Batch 9.20 — the original list view (student/calendar) is preserved
// exactly as it was; this component just wraps it with a toggle to a
// month-grid view, and is now shared by advisor/agency too (with an
// optional `subtitle` — the student's name — since those two need to see
// whose deadline is whose, which the student's own calendar never did).
export function DeadlineCalendarView({ items, emptyText }: { items: DeadlineItem[]; emptyText: string }) {
  const [view, setView] = useState<"list" | "grid">("list");
  const today = new Date();
  const [cursor, setCursor] = useState<{ year: number; month: number }>({
    year: today.getFullYear(),
    month: today.getMonth(),
  });

  const sorted = [...items].sort((a, b) => a.deadline.localeCompare(b.deadline));

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setView("list")}
          className={`rounded px-3 py-1.5 text-xs font-semibold ${
            view === "list" ? "bg-ink text-white" : "border border-line text-slate"
          }`}
        >
          清單
        </button>
        <button
          type="button"
          onClick={() => setView("grid")}
          className={`rounded px-3 py-1.5 text-xs font-semibold ${
            view === "grid" ? "bg-ink text-white" : "border border-line text-slate"
          }`}
        >
          月曆
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-slate">{emptyText}</p>
      ) : view === "list" ? (
        <ListView items={sorted} />
      ) : (
        <GridView items={sorted} cursor={cursor} setCursor={setCursor} />
      )}
    </div>
  );
}

function ListView({ items }: { items: DeadlineItem[] }) {
  return (
    <div className="rounded border border-line bg-surface shadow-card divide-y divide-line">
      {items.map((item) => {
        const remaining = daysRemaining(item.deadline);
        const urgent = remaining <= 7;
        const overdue = remaining < 0;
        return (
          <Link key={item.id} href={item.href} className="flex items-center gap-4 px-5 py-4 hover:bg-paper">
            <div className="w-16 text-center shrink-0">
              <div className="font-display text-lg font-bold">{new Date(item.deadline + "T00:00:00").getDate()}</div>
              <div className="text-[10px] text-slate uppercase font-util">
                {new Date(item.deadline + "T00:00:00").toLocaleString("en-US", { month: "short" })}
              </div>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">
                {item.title}
                {item.subtitle && <span className="text-slate font-normal"> · {item.subtitle}</span>}
              </div>
              <div className="text-xs text-slate">{item.deadline}</div>
            </div>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                overdue ? "bg-danger-tint text-danger" : urgent ? "bg-warn-tint text-warn" : "bg-slate-light text-slate"
              }`}
            >
              {overdue ? `已逾期 ${Math.abs(remaining)} 天` : `剩 ${remaining} 天`}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function GridView({
  items,
  cursor,
  setCursor,
}: {
  items: DeadlineItem[];
  cursor: { year: number; month: number };
  setCursor: (c: { year: number; month: number }) => void;
}) {
  const { year, month } = cursor;
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDay = new Map<number, DeadlineItem[]>();
  for (const item of items) {
    const d = new Date(item.deadline + "T00:00:00");
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      byDay.set(day, [...(byDay.get(day) || []), item]);
    }
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  function shiftMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => shiftMonth(-1)} className="rounded border border-line px-2.5 py-1 text-sm">
          ‹
        </button>
        <div className="font-display font-bold text-sm">{monthLabel(year, month)}</div>
        <button type="button" onClick={() => shiftMonth(1)} className="rounded border border-line px-2.5 py-1 text-sm">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate mb-1">
        {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="min-h-20 rounded bg-transparent" />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayItems = byDay.get(day) || [];
          const isToday = dateStr === todayStr;
          return (
            <div
              key={i}
              className={`min-h-20 rounded border p-1 ${isToday ? "border-brand bg-brand-tint/30" : "border-line"}`}
            >
              <div className={`text-[11px] mb-1 ${isToday ? "font-bold text-brand" : "text-slate"}`}>{day}</div>
              <div className="flex flex-col gap-0.5">
                {dayItems.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    title={item.subtitle ? `${item.title} · ${item.subtitle}` : item.title}
                    className="block truncate rounded bg-ink/5 px-1 py-0.5 text-[10px] text-ink hover:bg-ink/10"
                  >
                    {item.subtitle ? `${item.subtitle}：` : ""}
                    {item.title}
                  </Link>
                ))}
                {dayItems.length > 3 && <div className="text-[10px] text-slate">+{dayItems.length - 3} 項</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
