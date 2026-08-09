"use client";

import { useState } from "react";
import { CourseAutocomplete } from "@/components/CourseAutocomplete";
import {
  saveAcademicConfig,
  saveGradesForLevel,
  type AcademicConfig,
  type GradeRowInput,
  type SavedGradeRow,
} from "@/app/actions/grades";

const GRADING_SCALE_LABELS: Record<AcademicConfig["grading_scale"], string> = {
  percentage: "百分制（0–100）",
  letter: "字母等第（A–F）",
  gpa4: "GPA（0–4.0）",
};

const LETTER_OPTIONS = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"];

function GradeCell({
  scale,
  value,
  onChange,
}: {
  scale: AcademicConfig["grading_scale"];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  if (scale === "letter") {
    return (
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value || null)}
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
  const max = scale === "gpa4" ? 4 : 100;
  const step = scale === "gpa4" ? 0.1 : 1;
  return (
    <input
      type="number"
      min={0}
      max={max}
      step={step}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
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
    term_1_grade: null,
    term_2_grade: null,
    term_3_grade: null,
    term_4_grade: null,
  };
}

function toEditableRows(rows: SavedGradeRow[]): EditableRow[] {
  return rows.map((r) => ({ ...r, key: r.id }));
}

function GradeLevelTable({
  studentId,
  gradeLevel,
  initialRows,
  termsPerYear,
  gradingScale,
}: {
  studentId: string;
  gradeLevel: 11 | 12;
  initialRows: SavedGradeRow[];
  termsPerYear: number;
  gradingScale: AcademicConfig["grading_scale"];
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
    const result = await saveGradesForLevel(studentId, gradeLevel, rows);
    if (!result.success) {
      setSaveState("error");
      return;
    }
    setRows(result.rows.length > 0 ? toEditableRows(result.rows) : [newRow()]);
    setSaveState("saved");
  }

  const termCols = Array.from({ length: termsPerYear }, (_, i) => (i + 1) as 1 | 2 | 3 | 4);
  const termKey = (t: number) => `term_${t}_grade` as const;

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
                    onSelect={(name, courseId) =>
                      updateRow(row.key, { course_name: name, course_catalog_id: courseId })
                    }
                  />
                </td>
                {termCols.map((t) => (
                  <td key={t} className="px-3 py-2 w-24">
                    <GradeCell
                      scale={gradingScale}
                      value={row[termKey(t)]}
                      onChange={(v) => updateRow(row.key, { [termKey(t)]: v } as Partial<EditableRow>)}
                    />
                  </td>
                ))}
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
          onClick={() => setRows((prev) => [...prev, newRow()])}
          className="rounded border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-brand"
        >
          ➕ 新增科目
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded bg-ink px-4 py-1.5 text-xs font-semibold text-white"
        >
          💾 儲存成績
        </button>
        {saveState === "saving" && <span className="text-xs text-slate">儲存中…</span>}
        {saveState === "saved" && <span className="text-xs text-good">已儲存 ✓</span>}
        {saveState === "error" && <span className="text-xs text-danger">儲存失敗，請稍後再試。</span>}
      </div>
    </div>
  );
}

export function GradesEditor({
  studentId,
  initialConfig,
  initialGrades11,
  initialGrades12,
}: {
  studentId: string;
  initialConfig: AcademicConfig;
  initialGrades11: SavedGradeRow[];
  initialGrades12: SavedGradeRow[];
}) {
  const [config, setConfig] = useState<AcademicConfig>(initialConfig);
  const [configSaveState, setConfigSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [activeLevel, setActiveLevel] = useState<11 | 12>(11);

  async function handleConfigSave() {
    setConfigSaveState("saving");
    const result = await saveAcademicConfig(studentId, config);
    setConfigSaveState(result.success ? "saved" : "idle");
  }

  return (
    <div>
      <div className="rounded border border-line bg-surface shadow-card p-4 mb-6">
        <h3 className="font-display font-bold text-sm mb-3">學制設定</h3>
        <div className="flex flex-wrap items-end gap-4">
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
              onChange={(e) =>
                setConfig((c) => ({ ...c, grading_scale: e.target.value as AcademicConfig["grading_scale"] }))
              }
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
          選擇學校的學期制度與成績表示方式，下方成績表會自動配合調整。
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

      {activeLevel === 11 ? (
        <GradeLevelTable
          key="11"
          studentId={studentId}
          gradeLevel={11}
          initialRows={initialGrades11}
          termsPerYear={config.terms_per_year}
          gradingScale={config.grading_scale}
        />
      ) : (
        <GradeLevelTable
          key="12"
          studentId={studentId}
          gradeLevel={12}
          initialRows={initialGrades12}
          termsPerYear={config.terms_per_year}
          gradingScale={config.grading_scale}
        />
      )}
    </div>
  );
}
