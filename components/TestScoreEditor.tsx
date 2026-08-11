"use client";

import { useState } from "react";
import {
  saveTestScoresForCategory,
  type TestCategory,
  type TestScoreRowInput,
  type SavedTestScoreRow,
} from "@/app/actions/test-scores";
import { OTHER_OPTION } from "@/lib/exam-options";
import { getScoreBounds, isValidTestScore } from "@/lib/exam-score-bounds";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR + 1 - 2015 + 1 }, (_, i) => 2015 + i).reverse();

// Slightly more permissive than isValidTestScore: allows the in-progress
// states a person types through on the way to a valid value without ever
// accepting something that's already out of bounds — this is what
// actually stops "1139999" from being typeable into a 0–120 TOEFL field
// in the first place, rather than just failing quietly at save time.
// isValidTestScore itself (checked on blur, and again server-side) is
// the final, authoritative check, including the minimum and the
// increment (e.g. IELTS half-points, SAT/OET tens) for numeric scores,
// and the exact letter set for letter-graded ones (IB's EE/TOK).
function isValidPartialScore(category: string, examName: string, raw: string): boolean {
  if (raw === "") return true;
  const bounds = getScoreBounds(category, examName);

  if (bounds.kind === "free") return raw.length <= 40;

  // "select" never goes through the text-input path below — its value
  // always comes from a real <select>, which can only ever hold one of
  // the exact options — so there's nothing to partially validate here.

  if (bounds.kind === "letter") {
    // Typed one character at a time — just check it's a prefix of
    // something valid (a single letter from the allowed set, typed in
    // either case; blur normalizes to uppercase).
    if (raw.length > 1) return false;
    return (bounds.letterOptions || []).some((opt) => opt.toLowerCase() === raw.toLowerCase());
  }

  // numeric
  if (!/^\d*\.?\d*$/.test(raw)) return false; // digits and at most one dot — blocks letters entirely
  const numPart = raw.endsWith(".") ? raw.slice(0, -1) : raw;
  if (numPart === "") return true; // just "." so far
  const num = Number(numPart);
  return Number.isFinite(num) && num <= (bounds.max ?? Infinity);
}

type EditableRow = TestScoreRowInput & { key: string; usingCustomName: boolean };

function newRow(presetOptions: string[]): EditableRow {
  return {
    key: crypto.randomUUID(),
    exam_name: "",
    test_month: null,
    test_year: null,
    score: "",
    usingCustomName: presetOptions.length === 0,
  };
}

function toEditableRows(rows: SavedTestScoreRow[], presetOptions: string[]): EditableRow[] {
  return rows.map((r) => ({
    ...r,
    key: r.id,
    usingCustomName: presetOptions.length === 0 || !presetOptions.includes(r.exam_name),
  }));
}

export function TestScoreEditor({
  studentId,
  category,
  initialRows,
  heading,
  intro,
  presetOptions,
  examLabel = "考試名稱",
}: {
  studentId: string;
  category: TestCategory;
  initialRows: SavedTestScoreRow[];
  heading: string;
  intro: string;
  presetOptions: string[];
  examLabel?: string;
}) {
  const [rows, setRows] = useState<EditableRow[]>(
    initialRows.length > 0 ? toEditableRows(initialRows, presetOptions) : [newRow(presetOptions)]
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
    const result = await saveTestScoresForCategory(studentId, category, rows);
    if (!result.success) {
      setSaveState("error");
      return;
    }
    setRows(result.rows.length > 0 ? toEditableRows(result.rows, presetOptions) : [newRow(presetOptions)]);
    setSaveState("saved");
  }

  return (
    <div className="rounded-xl border border-line bg-surface shadow-card p-4">
      <h2 className="font-display font-bold text-base mb-1">{heading}</h2>
      <p className="text-xs text-slate mb-4">{intro}</p>

      <div className="flex flex-col gap-3">
        {rows.map((row) => {
          const bounds = getScoreBounds(category, row.exam_name);
          const hint = bounds.hint;
          return (
            <div key={row.key} className="rounded-lg border border-line p-3">
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-xs text-slate min-w-[220px] flex-1">
                  {examLabel}
                  {presetOptions.length > 0 && !row.usingCustomName ? (
                    <select
                      value={row.exam_name}
                      onChange={(e) => {
                        if (e.target.value === OTHER_OPTION) {
                          // Custom exam names fall back to a wide generic
                          // range, so an existing score always stays valid
                          // — no need to clear it here.
                          updateRow(row.key, { usingCustomName: true, exam_name: "" });
                        } else {
                          // Switching between two presets with different
                          // scales (e.g. TOEFL iBT -> IELTS Academic) can
                          // leave a score that's out of range for the new
                          // exam ("110" is valid for TOEFL but not IELTS).
                          // Same bug class as the Grades page's "switching
                          // scale shows the old out-of-range number" —
                          // clear it instead of silently keeping a value
                          // that's now invalid for what's actually selected.
                          const stillValid = isValidTestScore(category, e.target.value, row.score);
                          updateRow(row.key, {
                            exam_name: e.target.value,
                            score: stillValid ? row.score : "",
                          });
                        }
                      }}
                      className="rounded border border-line px-2 py-1.5 text-sm text-ink"
                    >
                      <option value="">請選擇</option>
                      {presetOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                      <option value={OTHER_OPTION}>{OTHER_OPTION}</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={row.exam_name}
                      onChange={(e) => updateRow(row.key, { exam_name: e.target.value })}
                      placeholder={presetOptions.length > 0 ? "輸入考試名稱" : undefined}
                      className="rounded border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-brand"
                    />
                  )}
                </label>

                <label className="flex flex-col gap-1 text-xs text-slate">
                  應試日期
                  <div className="flex gap-1">
                    <select
                      value={row.test_month ?? ""}
                      onChange={(e) =>
                        updateRow(row.key, { test_month: e.target.value ? Number(e.target.value) : null })
                      }
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
                      value={row.test_year ?? ""}
                      onChange={(e) =>
                        updateRow(row.key, { test_year: e.target.value ? Number(e.target.value) : null })
                      }
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

                <label className="flex flex-col gap-1 text-xs text-slate">
                  成績{hint && <span className="text-slate/70">（{hint}）</span>}
                  {bounds.kind === "select" ? (
                    <select
                      value={row.score}
                      onChange={(e) => updateRow(row.key, { score: e.target.value })}
                      className="rounded border border-line px-2 py-1.5 text-sm text-ink w-32"
                    >
                      <option value="">請選擇</option>
                      {(bounds.selectOptions || []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      inputMode={bounds.kind === "numeric" ? "decimal" : "text"}
                      value={row.score}
                      onChange={(e) => {
                        const next = e.target.value;
                        // Reject the keystroke outright if it would already be
                        // invalid (non-numeric/over-max for a numeric scale, or
                        // not a valid letter for a lettered one) — this is what
                        // actually stops "1139999" from being typeable into a
                        // 0–120 TOEFL field, rather than just failing quietly
                        // at save time.
                        if (isValidPartialScore(category, row.exam_name, next)) updateRow(row.key, { score: next });
                      }}
                      onBlur={(e) => {
                        // Clean up trailing-dot states (numeric), normalize
                        // case (letter), and clear anything that still isn't
                        // fully valid once typing has stopped.
                        let cleaned = e.target.value.trim();
                        if (bounds.kind === "numeric") cleaned = cleaned.replace(/\.$/, "");
                        if (bounds.kind === "letter") cleaned = cleaned.toUpperCase();
                        updateRow(row.key, { score: isValidTestScore(category, row.exam_name, cleaned) ? cleaned : "" });
                      }}
                      className="rounded border border-line px-2 py-1.5 text-sm text-ink outline-none focus:border-brand w-24"
                    />
                  )}
                </label>

                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  aria-label="刪除這筆紀錄"
                  title="刪除這筆紀錄"
                  className="text-slate hover:text-danger text-sm mb-1.5"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mt-3">
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, newRow(presetOptions)])}
          className="rounded border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-brand"
        >
          ➕ 新增一筆（可重複應試）
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
          <span className="text-xs text-danger">儲存失敗，請確認每筆成績都在有效範圍內，稍後再試。</span>
        )}
      </div>
    </div>
  );
}
