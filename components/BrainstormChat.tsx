"use client";

import { useState } from "react";
import {
  brainstormReply,
  archiveBrainstormSession,
  type BrainstormMessage,
  type ArchivedSessionRecord,
} from "@/app/actions/brainstorm";

const ERROR_MESSAGES: Record<string, string> = {
  empty_message: "請先輸入內容。",
  ai_not_configured: "AI 功能尚未設定完成，請聯絡系統管理者。",
  ai_request_failed: "AI 請求失敗，請稍後再試。",
  ai_empty_response: "AI 未能產生回覆，請稍後再試。",
  not_signed_in: "請重新登入後再試。",
  not_authorized: "您沒有權限為這位學生使用此功能。",
  daily_limit_reached: "今日 AI 腦力激盪次數已達上限，請明天再繼續，或直接把目前想法儲存下來。",
  parent_trial_limit_reached: "7 天試用期間的 AI 使用次數已達上限。付款啟用正式帳號後即可恢復使用。",
  no_seat: "此學生尚未分配席次，請聯絡機構管理者於「帳單與繳費」頁面指派席次。",
  expired: "此席次已到期（入學年度已結束），目前僅能檢視，無法編輯。",
  archived: "此學生帳號已被機構封存，目前僅能檢視，無法編輯。",
  canceled: "此席次已取消，無法使用。",
  license_inactive: "貴機構的授權訂閱目前未生效，請至「帳單與繳費」確認訂閱狀態。",
  seats_inactive: "貴機構的席次訂閱目前未生效，請至「帳單與繳費」確認訂閱狀態。",
  parent_account_inactive: "此帳號的訂閱目前未生效，請完成付款以繼續使用。",
};

export function BrainstormChat({
  studentId,
  archiveLabel = "封存這段對話",
  onArchived,
}: {
  // Whose record an archived session should be saved under. Always the
  // signed-in user for students; advisors/agency admins pass in whichever
  // student they're helping (see prompts pages) so the archive is filed
  // under the right person and visible to that student's other advisors.
  studentId: string;
  archiveLabel?: string;
  // Called with the freshly-archived session the moment the save succeeds,
  // so the parent (BrainstormWorkspace) can prepend it into the visible
  // list immediately — no page reload needed to see it appear.
  onArchived?: (session: ArchivedSessionRecord) => void;
}) {
  const [messages, setMessages] = useState<BrainstormMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archiveState, setArchiveState] = useState<"idle" | "saving" | "saved">("idle");

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    setLoading(true);
    setArchiveState("idle");
    const nextMessages: BrainstormMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");

    const result = await brainstormReply(messages, text, studentId);
    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setMessages([...nextMessages, { role: "assistant", content: result.reply }]);
    setLoading(false);
  }

  async function handleArchive() {
    if (messages.length === 0) return;
    setArchiveState("saving");
    const result = await archiveBrainstormSession(studentId, messages);
    if (!result.success) {
      setArchiveState("idle");
      setError(result.error);
      return;
    }
    setArchiveState("saved");
    onArchived?.(result.session);
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <h3 className="font-display font-bold text-base mb-1">AI 腦力激盪</h3>
      <p className="text-xs text-slate mb-4">
        貼上你的文書題目（可以是英文），然後用中文或英文說說你的初步想法 — AI
        會問你一些具體的問題，幫你把想法挖得更深，但不會幫你寫句子。
      </p>

      {messages.length > 0 && (
        <div className="flex flex-col gap-3 mb-4 max-h-[50vh] overflow-y-auto">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-brand-tint text-ink self-end max-w-[85%]"
                  : "bg-white border border-line text-ink max-w-[85%]"
              }`}
            >
              {m.content}
            </div>
          ))}
          {loading && <p className="text-xs text-slate">AI 思考中…</p>}
        </div>
      )}

      {error && (
        <div className="rounded border border-danger/30 bg-danger-tint text-danger text-xs px-3 py-2 mb-3">
          {ERROR_MESSAGES[error] || "發生錯誤，請稍後再試。"}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={3}
          placeholder={
            messages.length === 0
              ? "貼上文書題目，或直接說說你在想什麼…"
              : "繼續說說你的想法…"
          }
          className="flex-1 rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand resize-none"
        />
        <button
          type="button"
          onClick={send}
          disabled={loading || !input.trim()}
          className="rounded bg-brand px-4 py-2 text-xs font-semibold text-white disabled:opacity-60 h-fit"
        >
          送出
        </button>
      </div>

      <div className="flex items-center gap-3 mt-3">
        <button
          type="button"
          onClick={handleArchive}
          disabled={messages.length === 0 || archiveState === "saving"}
          className="rounded border border-line px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-50"
        >
          {archiveState === "saving" ? "封存中…" : `📄 ${archiveLabel}`}
        </button>
        {archiveState === "saved" && (
          <span className="text-xs text-good">已封存！其他顧問與機構管理者都能在下方查看。</span>
        )}
        <p className="text-[11px] text-slate">
          即時對話本身不會被儲存 — 離開頁面或重新整理後會消失；按下「封存」可把目前這段對話存成一份紀錄。
          正式寫作請到「我的申請」。
        </p>
      </div>
    </div>
  );
}
