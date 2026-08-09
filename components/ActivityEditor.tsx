"use client";

import { useState } from "react";
import {
  saveActivitiesForCategory,
  type ActivityCategory,
  type ActivityRowInput,
  type SavedActivityRow,
} from "@/app/actions/activities";

const MAX_WORDS = 50;
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR + 1 - 2015 + 1 }, (_, i) => 2015 + i);

function wordCount(text: string): number {
  return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
}

// Trims to the word limit rather than just blocking further typing —
// lets someone paste a longer draft and get it cut to size instead of
// having to manually count and trim themselves.
function clampWords(text: string): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= MAX_WORDS) return text;
  return words.slice(0, MAX_WORDS).join(" ");
}

type EditableRow = ActivityRowInput & { key: string };

function newRow(): EditableRow {
  return {
    key: crypto.randomUUID(),
    title: "",
    organization: "",
    start_month: null,
    start_year: null,
    end_month: null,
    end_year: null,
    hours_per_week: "",
    description: "",
  };
}

function toEditableRows(rows: SavedActivityRow[]): EditableRow[] {
  return rows.map((r) => ({ ...r, key: r.id }));
}

function MonthYearPicker({
  month,
  year,
  onChange,
  label,
}: {
  month: number | null;
  year: number | null;
  onChange: (month: number | null, year: number | null) => void;
  label: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate">
      {label}
      <div className="flex gap-1">
        <select
          value={month ?? ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null, year)}
          className="rounded border border-line px-1.5 py-1 text-sm text-ink"
        >
          <option value="">月</option>
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {m} 月
            </option>
          ))}
        </select>
        <select
          value={year ?? ""}
          onChange={(e) => onChange(month, e.target.value ? Number(e.target.value) : null)}
          className="rounded border border-line px-1.5 py-1 text-sm text-ink"
        >
          <option value="">年</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

export function ActivityEditor({
  studentId,
  category,
  initialRows,
  titleLabel = "名稱",
  orgLabel = "單位／組織",
  showHours = true,
  showEndDate = true,
  singleDateLabel = "日期",
}: {
  studentId: string;
  category: ActivityCategory;
  initialRows: SavedActivityRow[];
  titleLabel?: string;
  orgLabel?: string;
  showHours?: boolean;
  showEndDate?: boolean;
  singleDateLabel?: string;
}) {
  const [rows, setRows] = useState<EditableRow[]>(
    initialRows.length > 0 ? toEditableRows(initialRows) : [newRow()]
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  function updateRow(key: string, patch: Partial<EditableRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setSaveState("idle");
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
    setSaveState("idle");
  }

  async function handleSave() {
    setSaveState("saving");
    const result = await saveActivitiesForCategory(studentId, category, rows);
    if (!result.success) {
      setSaveState("error");
      return;
    }
    setRows(result.rows.length > 0 ? toEditableRows(result.rows) : [newRow()]);
    setSaveState("saved");
  }

  return (
    <div>
      <div className="flex flex-col gap-4">
        {rows.map((row) => {
          const words = wordCount(row.description);
          return (
            <div key={row.key} className="rounded-xl border border-line bg-surface shadow-card p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="grid gap-3 sm:grid-cols-2 flex-1">
                  <label className="flex flex-col gap-1 text-xs text-slate">
                    {titleLabel}
                    <input
                      type="text"
                      value={row.title}
                      onChange={(e) => updateRow(row.key, { title: e.target.value })}
                      className="rounded border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-brand"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-slate">
                    {orgLabel}
                    <input
                      type="text"
                      value={row.organization}
                      onChange={(e) => updateRow(row.key, { organization: e.target.value })}
                      className="rounded border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-brand"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  aria-label="刪除這一項"
                  title="刪除這一項"
                  className="text-slate hover:text-danger text-sm mt-5"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-wrap gap-4 mb-3">
                {showEndDate ? (
                  <>
                    <MonthYearPicker
                      label="開始"
                      month={row.start_month}
                      year={row.start_year}
                      onChange={(m, y) => updateRow(row.key, { start_month: m, start_year: y })}
                    />
                    <MonthYearPicker
                      label="結束（若持續中可留空）"
                      month={row.end_month}
                      year={row.end_year}
                      onChange={(m, y) => updateRow(row.key, { end_month: m, end_year: y })}
                    />
                  </>
                ) : (
                  <MonthYearPicker
                    label={singleDateLabel}
                    month={row.start_month}
                    year={row.start_year}
                    onChange={(m, y) => updateRow(row.key, { start_month: m, start_year: y })}
                  />
                )}
                {showHours && (
                  <label className="flex flex-col gap-1 text-xs text-slate">
                    每週時數
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.hours_per_week}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/^\d{0,3}(\.\d?)?$/.test(v) && (v === "" || Number(v) <= 168)) {
                          updateRow(row.key, { hours_per_week: v });
                        }
                      }}
                      placeholder="小時"
                      className="rounded border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-brand w-20"
                    />
                  </label>
                )}
              </div>

              <label className="flex flex-col gap-1 text-xs text-slate">
                簡短描述（限 50 字）
                <textarea
                  value={row.description}
                  onChange={(e) => updateRow(row.key, { description: clampWords(e.target.value) })}
                  rows={2}
                  className="rounded border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-brand resize-none"
                />
                <span className={`self-end text-xs ${words >= MAX_WORDS ? "text-warn" : "text-slate"}`}>
                  {words} / {MAX_WORDS} 字
                </span>
              </label>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, newRow()])}
          className="rounded border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-brand"
        >
          ➕ 新增一項
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded bg-ink px-4 py-1.5 text-xs font-semibold text-white"
        >
          💾 儲存
        </button>
        {saveState === "saving" && <span className="text-xs text-slate">儲存中…</span>}
        {saveState === "saved" && <span className="text-xs text-good">已儲存 ✓</span>}
        {saveState === "error" && (
          <span className="text-xs text-danger">儲存失敗，請確認每項描述在 50 字以內，稍後再試。</span>
        )}
      </div>
    </div>
  );
}
