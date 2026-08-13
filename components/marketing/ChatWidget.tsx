"use client";

import { useState, useRef, useEffect } from "react";
import { submitChatbotEmail } from "@/app/actions/public";
import { isValidEmail } from "@/lib/public-form-validation";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "您好！歡迎來到 Native English Studio 👋 我可以回答關於平台功能、適合對象、費用大概範圍的問題，有什麼想了解的嗎？",
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          setErrorMsg("今天的對話已達上限，歡迎直接寄信至 info@nativeenglish.ca。");
        } else {
          setErrorMsg("暫時無法回應，請稍後再試一次。");
        }
        setLoading(false);
        return;
      }

      const data = (await res.json()) as { reply: string };
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setErrorMsg("網路連線好像有問題，請稍後再試一次。");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    if (!isValidEmail(email)) {
      setEmailError("請確認電子郵件格式是否正確。");
      return;
    }
    const result = await submitChatbotEmail(email);
    if (!result.success) {
      setEmailError("送出時發生問題，請稍後再試一次。");
      return;
    }
    setEmailSubmitted(true);
  }

  return (
    <div className="fixed bottom-5 right-5 z-30">
      {open && (
        <div className="mb-3 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded border border-line bg-surface shadow-card">
          <div className="flex items-center justify-between border-b border-line bg-ink px-4 py-3">
            <span className="font-display text-sm font-bold text-white">
              Native English Studio
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="關閉聊天"
              className="text-white/80 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-brand text-white"
                    : "bg-brand-tint text-ink"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="max-w-[70%] rounded bg-brand-tint px-3 py-2 text-sm text-slate">
                輸入中…
              </div>
            )}
            {errorMsg && (
              <p className="text-xs text-danger" role="alert">
                {errorMsg}
              </p>
            )}
          </div>

          {/* Optional email capture — only offered after at least one real
              exchange, and never auto-filled from chat text (see
              submitChatbotEmail's comment for why). */}
          {messages.length > 1 && !emailSubmitted && (
            <form
              onSubmit={handleEmailSubmit}
              className="border-t border-line bg-paper px-3 py-2"
            >
              <p className="mb-1.5 text-xs text-slate">
                想收到後續資訊嗎？留下 email，我們會主動與您聯繫。
              </p>
              <div className="flex gap-1.5">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="min-w-0 flex-1 rounded border border-line px-2 py-1.5 text-xs focus:border-brand outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded bg-ink px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand transition-colors"
                >
                  送出
                </button>
              </div>
              {emailError && <p className="mt-1 text-xs text-danger">{emailError}</p>}
            </form>
          )}
          {emailSubmitted && (
            <div className="border-t border-line bg-paper px-3 py-2 text-xs text-good">
              已收到，謝謝！我們會盡快與您聯繫。
            </div>
          )}

          <form onSubmit={handleSend} className="flex gap-2 border-t border-line p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="輸入您的問題…"
              className="min-w-0 flex-1 rounded border border-line px-3 py-2 text-sm focus:border-brand outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="shrink-0 rounded bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-brand transition-colors disabled:opacity-50"
            >
              送出
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-card hover:bg-brand transition-colors"
        aria-label={open ? "關閉聊天視窗" : "開啟聊天視窗"}
      >
        {open ? (
          <span className="text-xl">✕</span>
        ) : (
          <span className="text-2xl">💬</span>
        )}
      </button>
    </div>
  );
}
