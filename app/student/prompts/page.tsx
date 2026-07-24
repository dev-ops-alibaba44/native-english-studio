"use client";

import { useState } from "react";

const PROMPTS = [
  {
    q: "說一個真正改變你想法的時刻",
    a: "想想看：那件事發生之前，你是怎麼想的？發生當下，你注意到什麼？後來你的想法、行為有什麼不一樣？先不用想英文，用中文把畫面寫下來就好——之後可以把它變成大綱、再變成英文草稿。",
  },
  {
    q: "哪一個課外活動最能代表你？",
    a: "從「我的檔案」挑一項活動，想想：你在裡面做了什麼決定？遇到什麼困難？如果重來一次，你會怎麼做？",
  },
  {
    q: "你想讓招生官記住你的哪一件事？",
    a: "不用是最厲害的成就，反而是最「像你」的一件小事，通常更有記憶點。",
  },
];

export default function PromptsPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">發想與大綱</h1>
      <p className="text-sm text-slate mb-6">從幾個問題開始想，不用一次就寫得完美。</p>

      {PROMPTS.map((p, i) => {
        const open = openIndex === i;
        return (
          <div
            key={p.q}
            onClick={() => setOpenIndex(open ? null : i)}
            className="rounded-xl border border-line bg-surface p-4 mb-3 cursor-pointer"
          >
            <div className="flex items-center justify-between font-semibold text-sm">
              {p.q}
              <span className={`text-slate transition-transform ${open ? "rotate-90" : ""}`}>
                ›
              </span>
            </div>
            {open && (
              <div className="text-sm text-slate mt-2.5 leading-relaxed">{p.a}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
