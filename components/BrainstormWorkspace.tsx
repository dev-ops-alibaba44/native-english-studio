"use client";

import { useState } from "react";
import { BrainstormChat } from "@/components/BrainstormChat";
import { BrainstormSessionArchive, type ArchivedSession } from "@/components/BrainstormSessionArchive";
import type { ArchivedSessionRecord } from "@/app/actions/brainstorm";

// Owns the archived-session list as client state, seeded from the server's
// initial query. Archiving a conversation used to only ever show up after
// a manual page reload, because BrainstormChat (which saves) and
// BrainstormSessionArchive (which lists) each got their data from a
// one-time server-rendered prop with nothing connecting the two client-side.
// Lifting the list up here and updating it directly in onArchived closes
// that gap without depending on any page refetch/revalidation timing.
export function BrainstormWorkspace({
  studentId,
  archiveLabel,
  initialSessions,
  heading = "📄 過去封存的對話",
  // Optional content rendered between the chat and the archived-session
  // list (e.g. the advisor/agency pages put the student's saved question
  // answers there) — kept as a slot so this component only has to own the
  // chat<->archive state, not dictate page layout.
  betweenSlot,
}: {
  studentId: string;
  archiveLabel?: string;
  initialSessions: ArchivedSession[];
  heading?: string;
  betweenSlot?: React.ReactNode;
}) {
  const [sessions, setSessions] = useState<ArchivedSession[]>(initialSessions);

  function handleArchived(session: ArchivedSessionRecord) {
    setSessions((prev) => [session, ...prev]);
  }

  return (
    <>
      <BrainstormChat studentId={studentId} archiveLabel={archiveLabel} onArchived={handleArchived} />
      {betweenSlot}
      <div className="mt-6">
        <h3 className="font-display font-bold text-base mb-2">{heading}</h3>
        <BrainstormSessionArchive sessions={sessions} />
      </div>
    </>
  );
}
