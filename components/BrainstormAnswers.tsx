"use client";

import { useState } from "react";
import { saveBrainstormAnswer } from "@/app/actions/brainstorm";

export interface BrainstormQuestion {
  key: string;
  q: string;
  hint?: string;
}

export function BrainstormAnswers({
  questions,
  initialAnswers,
  readOnly = false,
}: {
  questions: BrainstormQuestion[];
  initialAnswers: Record<string, { text: string; updatedAt: string | null }>;
  readOnly?: boolean;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [answers, setAnswers] = useState(initialAnswers);
  const [saving, setSaving] = useState<string | null>(null);

  async function handleSave(key: string) {
    setSaving(key);
    const result = await saveBrainstormAnswer(key, answers[key]?.text || "");
    if (result.success) {
      setAnswers((prev) => ({
        ...prev,
        [key]: { text: prev[key]?.text || "", updatedAt: result.savedAt },
      }));
    }
    setSaving(null);
  }

  return (
    <>
      {questions.map((item, i) => {
        const open = openIndex === i;
        const entry = answers[item.key] || { text: "", updatedAt: null };
        return (
          <div key={item.key} className="rounded-xl border border-line bg-surface p-4 mb-3">
            <div
              onClick={() => setOpenIndex(open ? null : i)}
              className="flex items-center justify-between font-semibold text-sm cursor-pointer"
            >
              {item.q}
              <span className={`text-slate transition-transform ${open ? "rotate-90" : ""}`}>›</span>
            </div>
            {open && (
              <div className="mt-2.5">
                {item.hint && <p className="text-sm text-slate leading-relaxed mb-2">{item.hint}</p>}
                <textarea
                  value={entry.text}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [item.key]: { text: e.target.value, updatedAt: entry.updatedAt },
                    }))
                  }
                  readOnly={readOnly}
                  rows={3}
                  placeholder={readOnly ? "（尚未填寫）" : "在這裡寫下你的想法…"}
                  className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand resize-none bg-white"
                />
                {!readOnly && (
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => handleSave(item.key)}
                      disabled={saving === item.key}
                      className="rounded bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {saving === item.key ? "儲存中…" : "💾 儲存"}
                    </button>
                    {entry.updatedAt && (
                      <span className="text-xs text-slate">
                        上次儲存於{" "}
                        {new Date(entry.updatedAt).toLocaleString("zh-TW", {
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                )}
                {readOnly && entry.updatedAt && (
                  <p className="text-xs text-slate mt-1">
                    上次儲存於{" "}
                    {new Date(entry.updatedAt).toLocaleString("zh-TW", {
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
