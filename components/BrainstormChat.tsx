"use client";

import { useState } from "react";
import { brainstormReply, type BrainstormMessage } from "@/app/actions/brainstorm";

const ERROR_MESSAGES: Record<string, string> = {
  empty_message: "請先輸入內容。",
  ai_not_configured: "AI 功能尚未設定完成，請聯絡系統管理者。",
  ai_request_failed: "AI 請求失敗，請稍後再試。",
  ai_empty_response: "AI 未能產生回覆，請稍後再試。",
  not_signed_in: "請重新登入後再試。",
};

export function BrainstormChat() {
  const [messages, setMessages] = useState<BrainstormMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    setLoading(true);
    const nextMessages: BrainstormMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");

    const result = await brainstormReply(messages, text);
    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setMessages([...nextMessages, { role: "assistant", content: result.reply }]);
    setLoading(false);
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
      <p className="text-[11px] text-slate mt-2">
        這個對話不會被儲存 — 離開頁面或重新整理後就會消失，適合快速理清思路，正式寫作請到「我的申請」。
      </p>
    </div>
  );
}
