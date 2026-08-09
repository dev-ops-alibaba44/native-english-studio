"use client";

import { useState } from "react";
import { CourseAutocomplete } from "@/components/CourseAutocomplete";
import { SchoolAutocomplete } from "@/components/SchoolAutocomplete";
import {
  saveAcademicConfig,
  saveGradesForLevel,
  type AcademicConfig,
  type GradeRowInput,
  type SavedGradeRow,
} from "@/app/actions/grades";
import { GRADING_SCALE_LABELS, LETTER_OPTIONS, isValidGradeValue, type GradingScale } from "@/lib/grade-scales";

// Slightly more permissive than isValidGradeValue: allows the
// in-progress states a person types through on the way to a valid number
// ("3", "3.", "3.7") without ever accepting something that's already out
// of bounds or non-numeric. isValidGradeValue itself is the final,
// authoritative check (used again on blur, and again server-side).
function isValidPartialNumber(scale: GradingScale, raw: string): boolean {
  if (raw === "") return true;
  if (!/^\d*\.?\d*$/.test(raw)) return false; // digits and at most one dot — blocks letters entirely
  const numPart = raw.endsWith(".") ? raw.slice(0, -1) : raw;
  if (numPart === "") return true; // just "." so far
  const num = Number(numPart);
  const max = scale === "gpa4" ? 4 : 100;
  return Number.isFinite(num) && num <= max;
}

function GradeCell({
  scale,
  value,
  onChange,
}: {
  scale: GradingScale;
  value: string;
  onChange: (v: string) => void;
}) {
  if (scale === "letter") {
    return (
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-line px-1.5 py-1 text-sm outline-none focus:border-brand"
      >
        <option value="">—</option>
        {LETTER_OPTIONS.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => {
        const next = e.target.value;
        // Reject the keystroke outright if it would already be invalid
        // (non-numeric, or over the scale's max) — this is what actually
        // stops "34555" from being typeable into a 0-100 field in the
        // first place, rather than just failing quietly at save time.
        if (isValidPartialNumber(scale, next)) onChange(next);
      }}
      onBlur={(e) => {
        // Clean up trailing-dot states ("88.") and anything that still
        // isn't a fully valid value once typing has stopped.
        const cleaned = e.target.value.replace(/\.$/, "");
        onChange(isValidGradeValue(scale, cleaned) ? cleaned : "");
      }}
      placeholder="—"
      className="w-full rounded border border-line px-1.5 py-1 text-sm outline-none focus:border-brand"
    />
  );
}

type EditableRow = GradeRowInput & { key: string };

function newRow(): EditableRow {
  return {
    key: crypto.randomUUID(),
    course_name: "",
    course_catalog_id: null,
    term_1_grades: {},
    term_2_grades: {},
    term_3_grades: {},
    term_4_grades: {},
  };
}

function toEditableRows(rows: SavedGradeRow[]): EditableRow[] {
  return rows.map((r) => ({ ...r, key: r.id }));
}

const TERM_KEYS = ["term_1_grades", "term_2_grades", "term_3_grades", "term_4_grades"] as const;

function GradeLevelTable({
  rows,
  onRowsChange,
  termsPerYear,
  gradingScale,
  schoolId,
  onSave,
  saveState,
}: {
  rows: EditableRow[];
  onRowsChange: (rows: EditableRow[]) => void;
  termsPerYear: number;
  gradingScale: GradingScale;
  schoolId: string | null;
  onSave: () => void;
  saveState: "idle" | "saving" | "saved" | "error";
}) {
  function updateRow(key: string, patch: Partial<EditableRow>) {
    onRowsChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function updateTermGrade(key: string, termKey: (typeof TERM_KEYS)[number], v: string) {
    const row = rows.find((r) => r.key === key);
    if (!row) return;
    const nextTermGrades = { ...row[termKey], [gradingScale]: v };
    if (v === "") delete nextTermGrades[gradingScale];
    onRowsChange(rows.map((r) => (r.key === key ? { ...r, [termKey]: nextTermGrades } : r)));
  }

  function removeRow(key: string) {
    onRowsChange(rows.filter((r) => r.key !== key));
  }

  const termCols = Array.from({ length: termsPerYear }, (_, i) => (i + 1) as 1 | 2 | 3 | 4);

  return (
    <div>
      <div className="overflow-x-auto rounded border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink text-white">
              <th className="text-left px-3 py-2 font-medium">科目</th>
              {termCols.map((t) => (
                <th key={t} className="text-left px-3 py-2 font-medium whitespace-nowrap">
                  第 {t} 學期
                </th>
              ))}
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-line even:bg-paper">
                <td className="px-3 py-2 min-w-[220px]">
                  <CourseAutocomplete
                    value={row.course_name}
                    schoolId={schoolId}
                    onSelect={(name, courseId) =>
                      updateRow(row.key, { course_name: name, course_catalog_id: courseId })
                    }
                  />
                </td>
                {termCols.map((t) => {
                  const termKey = TERM_KEYS[t - 1];
                  return (
                    <td key={t} className="px-3 py-2 w-24">
                      <GradeCell
                        scale={gradingScale}
                        value={row[termKey][gradingScale] || ""}
                        onChange={(v) => updateTermGrade(row.key, termKey, v)}
                      />
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    aria-label="刪除這一列"
                    title="刪除這一列"
                    className="text-slate hover:text-danger text-sm"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 mt-3">
        <button
          type="button"
          onClick={() => onRowsChange([...rows, newRow()])}
          className="rounded border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-brand"
        >
          ➕ 新增科目
        </button>
        <button
          type="button"
          onClick={onSave}
          className="rounded bg-ink px-4 py-1.5 text-xs font-semibold text-white"
        >
          💾 儲存成績
        </button>
        {saveState === "saving" && <span className="text-xs text-slate">儲存中…</span>}
        {saveState === "saved" && <span className="text-xs text-good">已儲存 ✓</span>}
        {saveState === "error" && (
          <span className="text-xs text-danger">儲存失敗，請確認每個成績都在有效範圍內，稍後再試。</span>
        )}
      </div>
    </div>
  );
}

export function GradesEditor({
  studentId,
  initialConfig,
  initialSchoolName,
  initialGrades11,
  initialGrades12,
}: {
  studentId: string;
  initialConfig: AcademicConfig;
  initialSchoolName: string;
  initialGrades11: SavedGradeRow[];
  initialGrades12: SavedGradeRow[];
}) {
  const [config, setConfig] = useState<AcademicConfig>(initialConfig);
  const [schoolName, setSchoolName] = useState(initialSchoolName);
  const [configSaveState, setConfigSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [activeLevel, setActiveLevel] = useState<11 | 12>(11);

  // Lifted up here - ABOVE the tab switch that decides which
  // GradeLevelTable is displayed - rather than living inside
  // GradeLevelTable itself. That was the actual cause of grades
  // "disappearing" when switching Grade 11 -> Grade 12 -> Grade 11: each
  // table previously held its own local state, seeded once from the
  // page's initial load; switching tabs unmounted the inactive table
  // entirely, and switching back remounted it from that same stale
  // initial prop, discarding whatever had just been saved. Both grade
  // levels' rows now live here instead, and the tabs below just toggle
  // which one is visible (via CSS display, not conditional unmounting) -
  // so a tab switch was never able to lose data in the first place.
  const [rows11, setRows11] = useState<EditableRow[]>(
    initialGrades11.length > 0 ? toEditableRows(initialGrades11) : [newRow()]
  );
  const [rows12, setRows12] = useState<EditableRow[]>(
    initialGrades12.length > 0 ? toEditableRows(initialGrades12) : [newRow()]
  );
  const [saveState11, setSaveState11] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveState12, setSaveState12] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleConfigSave() {
    setConfigSaveState("saving");
    const result = await saveAcademicConfig(studentId, config);
    setConfigSaveState(result.success ? "saved" : "idle");
  }

  async function handleSave(level: 11 | 12) {
    const rows = level === 11 ? rows11 : rows12;
    const setRows = level === 11 ? setRows11 : setRows12;
    const setSaveState = level === 11 ? setSaveState11 : setSaveState12;
    setSaveState("saving");
    const result = await saveGradesForLevel(studentId, level, rows);
    if (!result.success) {
      setSaveState("error");
      return;
    }
    setRows(result.rows.length > 0 ? toEditableRows(result.rows) : [newRow()]);
    setSaveState("saved");
  }

  return (
    <div>
      <div className="rounded border border-line bg-surface shadow-card p-4 mb-6">
        <h3 className="font-display font-bold text-sm mb-3">學制設定</h3>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-xs text-slate w-64">
            就讀學校
            <SchoolAutocomplete
              value={schoolName}
              onSelect={(name, schoolId) => {
                setSchoolName(name);
                setConfig((c) => ({ ...c, school_id: schoolId }));
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate">
            每學年學期數
            <select
              value={config.terms_per_year}
              onChange={(e) => setConfig((c) => ({ ...c, terms_per_year: Number(e.target.value) }))}
              className="rounded border border-line px-2 py-1.5 text-sm text-ink"
            >
              <option value={2}>2（上下學期制）</option>
              <option value={3}>3（三學期制）</option>
              <option value={4}>4（四分制/季制）</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate">
            成績制度
            <select
              value={config.grading_scale}
              onChange={(e) => setConfig((c) => ({ ...c, grading_scale: e.target.value as GradingScale }))}
              className="rounded border border-line px-2 py-1.5 text-sm text-ink"
            >
              {Object.entries(GRADING_SCALE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleConfigSave}
            className="rounded bg-ink px-3 py-1.5 text-xs font-semibold text-white"
          >
            更新學制設定
          </button>
          {configSaveState === "saving" && <span className="text-xs text-slate">儲存中…</span>}
          {configSaveState === "saved" && <span className="text-xs text-good">已儲存 ✓</span>}
        </div>
        <p className="text-xs text-slate mt-2">
          每種成績制度會分開儲存，切換制度不會覆蓋或遺失其他制度下已輸入的成績。
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setActiveLevel(11)}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
            activeLevel === 11 ? "bg-brand text-white" : "bg-white border border-line text-ink"
          }`}
        >
          高二（Grade 11）
        </button>
        <button
          type="button"
          onClick={() => setActiveLevel(12)}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
            activeLevel === 12 ? "bg-brand text-white" : "bg-white border border-line text-ink"
          }`}
        >
          高三（Grade 12）
        </button>
      </div>

      <div style={{ display: activeLevel === 11 ? "block" : "none" }}>
        <GradeLevelTable
          rows={rows11}
          onRowsChange={setRows11}
          termsPerYear={config.terms_per_year}
          gradingScale={config.grading_scale}
          schoolId={config.school_id}
          onSave={() => handleSave(11)}
          saveState={saveState11}
        />
      </div>
      <div style={{ display: activeLevel === 12 ? "block" : "none" }}>
        <GradeLevelTable
          rows={rows12}
          onRowsChange={setRows12}
          termsPerYear={config.terms_per_year}
          gradingScale={config.grading_scale}
          schoolId={config.school_id}
          onSave={() => handleSave(12)}
          saveState={saveState12}
        />
      </div>
    </div>
  );
}
