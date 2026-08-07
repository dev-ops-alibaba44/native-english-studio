"use client";

import { useEffect, useState } from "react";

export interface ArchivedSession {
  id: string;
  authorName: string;
  createdAt: string;
  transcript: string;
}

// All session transcripts are passed in already-fetched (one query, done
// server-side by the page) — picking a different session from the dropdown
// is a pure client-side state change, no re-fetch and no AI call involved.
export function BrainstormSessionArchive({ sessions }: { sessions: ArchivedSession[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(sessions[0]?.id || null);
  // If a session gets archived while this list was empty (or nothing was
  // selected yet), jump straight to showing it rather than leaving the
  // panel on "尚無封存的紀錄" until the user manually opens the dropdown.
  useEffect(() => {
    if (!selectedId && sessions.length > 0) setSelectedId(sessions[0].id);
  }, [sessions, selectedId]);
  const selected = sessions.find((s) => s.id === selectedId) || null;

  if (sessions.length === 0) {
    return <p className="text-sm text-slate">尚無封存的腦力激盪紀錄。</p>;
  }

  return (
    <div>
      <select
        value={selectedId || ""}
        onChange={(e) => setSelectedId(e.target.value || null)}
        className="appearance-none rounded border border-line pl-3 pr-9 py-2 text-sm outline-none focus:border-brand bg-white bg-no-repeat mb-3"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23172983' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
          backgroundPosition: "right 0.75rem center",
        }}
      >
        {sessions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.authorName} —{" "}
            {new Date(s.createdAt).toLocaleString("zh-TW", {
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </option>
        ))}
      </select>

      {selected && (
        <div className="rounded border border-line bg-white shadow-card p-4 max-h-[50vh] overflow-y-auto">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.transcript}</p>
        </div>
      )}
    </div>
  );
}
