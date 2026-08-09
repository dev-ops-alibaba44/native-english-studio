"use client";

import { useState } from "react";
import {
  generateProfileAssessment,
  saveProfileAssessment,
  type SavedAssessment,
} from "@/app/actions/profile-assessment";

const ERROR_MESSAGES: Record<string, string> = {
  ai_not_configured: "AI 評估功能尚未設定完成，請聯絡系統管理者。",
  not_signed_in: "請重新登入後再試。",
  not_authorized: "沒有權限對此學生產生評估。",
  monthly_limit_reached: "本月的 AI 綜合評估次數已達上限，請下個週期再試。",
  ai_request_failed: "AI 評估請求失敗，請稍後再試。",
  ai_empty_response: "AI 未能產生評估，請稍後再試。",
  save_failed: "儲存失敗，請稍後再試。",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ProfileAssessmentPanel({
  studentId,
  initialHistory,
}: {
  studentId: string;
  initialHistory: SavedAssessment[];
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedAssessment[]>(initialHistory);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(initialHistory[0]?.id || null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    const result = await generateProfileAssessment(studentId);
    setGenerating(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setDraft(result.content);
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    const result = await saveProfileAssessment(studentId, draft);
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setHistory((prev) => [result.assessment, ...prev]);
    setSelectedHistoryId(result.assessment.id);
    setDraft(null);
  }

  const selected = history.find((h) => h.id === selectedHistoryId) || null;

  return (
    <div className="mt-8 rounded-xl border border-brand/20 bg-brand-tint p-5">
      <h2 className="font-display font-bold text-base mb-2">🤖 AI 綜合評估</h2>
      <p className="text-sm text-ink mb-1">
        AI 會綜合成績、測驗成績、活動與正在準備的文書，提供加強建議、適合的學校方向，以及每所準備中學校的機會等級
        （衝刺 / 目標 / 保底）。這是根據自行填寫資料的粗略估算，不是專業預測或保證 —— 詳見評估內容最後的提醒。
      </p>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating}
        className="mt-3 rounded bg-ink px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
      >
        {generating ? "AI 評估中…（可能需要 10–20 秒）" : "✨ 產生新的評估"}
      </button>

      {error && <p className="text-xs text-danger mt-2">{ERROR_MESSAGES[error] || "發生錯誤，請稍後再試。"}</p>}

      {draft && (
        <div className="mt-4 rounded-lg border border-line bg-surface p-4">
          <p className="whitespace-pre-wrap text-sm text-ink leading-relaxed">{draft}</p>
          <div className="flex items-center gap-3 mt-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded bg-ink px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              💾 儲存這份評估
            </button>
            {saving && <span className="text-xs text-slate">儲存中…</span>}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-5">
          <h3 className="font-display font-bold text-sm mb-2">📄 過去儲存的評估</h3>
          <select
            value={selectedHistoryId || ""}
            onChange={(e) => setSelectedHistoryId(e.target.value || null)}
            className="rounded border border-line px-2 py-1.5 text-sm text-ink bg-white"
          >
            {history.map((h) => (
              <option key={h.id} value={h.id}>
                {formatDate(h.createdAt)} — {h.requestedByName}
              </option>
            ))}
          </select>
          {selected && (
            <div className="mt-3 rounded-lg border border-line bg-surface p-4">
              <p className="whitespace-pre-wrap text-sm text-ink leading-relaxed">{selected.content}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
