"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Renders nothing. Subscribes to Postgres changes on `drafts` (for this
 * application) and `comments` (for this draft, if any) and calls
 * router.refresh() when either changes, so a live viewer sees new drafts,
 * comments, or highlights appear without reloading the page.
 *
 * This is real-time *syncing*, not real-time co-editing of the essay text
 * itself — the underlying draft content still only changes when the
 * student explicitly saves a new version.
 */
export function LiveRefresh({
  applicationId,
  draftId,
}: {
  applicationId: string;
  draftId?: string | null;
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`live-${applicationId}-${draftId || "none"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "drafts",
          filter: `application_id=eq.${applicationId}`,
        },
        () => router.refresh()
      );

    if (draftId) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `draft_id=eq.${draftId}`,
        },
        () => router.refresh()
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [applicationId, draftId, router]);

  return null;
}
