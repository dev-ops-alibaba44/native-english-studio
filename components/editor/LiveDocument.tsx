"use client";

import { useEffect, useState } from "react";
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
  useOthers,
  useSelf,
} from "@liveblocks/react";
import { useThreads } from "@liveblocks/react/suspense";
import { useLiveblocksExtension, FloatingComposer } from "@liveblocks/react-tiptap";
import { Thread } from "@liveblocks/react-ui";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import { SnapshotHistory, type SnapshotInfo } from "@/components/SnapshotHistory";
import type { SavedSnapshot } from "@/app/actions/documents";
import "@liveblocks/react-ui/styles.css";
import "@liveblocks/react-tiptap/styles.css";

// Duplicated (not imported) from lib/liveblocks-server.ts on purpose —
// that file imports @liveblocks/node, a server-only package that must
// never end up in the client bundle. This is just a plain string constant,
// safe and simple to keep in sync manually across the two files.
const AI_FEEDBACK_USER_ID = "ai-advisor";

const AI_ERROR_MESSAGES: Record<string, string> = {
  essay_empty: "文件目前是空的，請先撰寫內容再請求 AI 回饋。",
  essay_too_short: "內容太短，請至少寫 30 個字再請求 AI 回饋。",
  ai_not_configured: "AI 回饋功能尚未設定完成，請聯絡系統管理者。",
  ai_request_failed: "AI 回饋請求失敗，請稍後再試。",
  ai_empty_response: "AI 未能產生回饋，請稍後再試。",
  comment_post_failed: "AI 回饋已產生，但留言失敗，請稍後再試。",
  not_authorized: "沒有權限對此文件請求 AI 回饋。",
  not_signed_in: "請重新登入後再試。",
  monthly_limit_reached: "這位學生本月的 AI 回饋次數已達上限，請至「帳號設定」查看用量，或等下個週期再試。",
};

function PresenceBar() {
  const others = useOthers();
  const self = useSelf();

  const people = [
    ...(self ? [{ id: "self", info: self.info, isSelf: true }] : []),
    ...others.map((o) => ({ id: String(o.connectionId), info: o.info, isSelf: false })),
  ];

  if (people.length === 0) return null;

  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xs text-slate">目前在線：</span>
      <div className="flex -space-x-2">
        {people.map((p: any) => (
          <div
            key={p.id}
            title={`${p.info?.name || "User"}${p.info?.role ? `（${p.info.role}）` : ""}`}
            className="w-7 h-7 rounded-full border-2 border-surface flex items-center justify-center text-[10px] font-bold text-white"
            style={{ backgroundColor: p.info?.color || "#666" }}
          >
            {(p.info?.name || "?").slice(0, 1)}
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`w-8 h-8 rounded flex items-center justify-center text-sm font-semibold border ${
        active
          ? "bg-brand text-white border-brand"
          : "bg-white text-ink border-line hover:border-brand"
      }`}
    >
      {children}
    </button>
  );
}

function CollaborativeEditor({
  onSaveSnapshot,
  onRequestAIFeedback,
  snapshots,
  onSnapshotSaved,
  basePath,
  activeSnapshotId,
  saveError,
  onSaveErrorChange,
}: {
  onSaveSnapshot?: (
    formData: FormData
  ) => Promise<{ success: true; snapshot: SavedSnapshot } | { success: false; error: string }>;
  onRequestAIFeedback?: (
    formData: FormData
  ) => Promise<{ success: true } | { success: false; error: string }>;
  // Snapshots (and saveError) are now owned by LiveDocument, ABOVE the
  // <ClientSideSuspense> boundary this component lives inside — passed
  // down as props rather than held in local state here. See the long
  // comment on LiveDocument below for why: this component can be
  // legitimately unmounted/remounted by Liveblocks itself (useThreads() is
  // Suspense-driven), which was silently resetting any state kept in here
  // back to stale initial values — the actual cause of the "最後儲存於
  // reverts to the old time" bug, not the router.refresh() race this was
  // originally (correctly, just incompletely) diagnosed as.
  snapshots: SnapshotInfo[];
  onSnapshotSaved: (snapshot: SavedSnapshot) => void;
  basePath: string;
  activeSnapshotId: string | null;
  saveError: string | null;
  onSaveErrorChange: (error: string | null) => void;
}) {
  const liveblocksExtension = useLiveblocksExtension();
  const { threads } = useThreads();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const lastSavedAt = snapshots[0] ? new Date(snapshots[0].created_at) : null;
  // Which thread card should be visually "pinged" in the sidebar right now
  // — set when the reader clicks a highlighted/commented word in the essay
  // itself, so they can see which comment that highlight belongs to.
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      liveblocksExtension,
      // history: false — Liveblocks/Yjs manages undo/redo itself via the
      // shared document; Tiptap's own history extension conflicts with it.
      StarterKit.configure({
        history: false,
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Underline,
      Highlight.configure({ multicolor: false }),
    ],
    immediatelyRender: false,
    // Detects clicks on a comment-anchored word in the essay and jumps the
    // matching thread card into view in the sidebar (scroll + a brief
    // highlight ring), independent of which UI renders the thread list.
    // This does NOT use Liveblocks' AnchoredThreads/FloatingThreads —
    // those position every thread by continuous pixel-math against the
    // editor's exact layout, which is what caused the comments-not-
    // showing/overlapping/clipping bugs described in HANDOFF.md. This is
    // just a one-off DOM lookup + scrollIntoView on click, so it can't
    // silently drift out of alignment the way pixel-tracking could.
    editorProps: {
      handleClick(view, pos) {
        const marks = view.state.doc.resolve(pos).marks();
        const commentMark = marks.find((m) => m.type.name === "liveblocksCommentMark");
        if (!commentMark) return false;
        // Attribute name isn't documented explicitly by Liveblocks, so we
        // check both spellings we've seen used for this kind of mark.
        const threadId: string | undefined =
          (commentMark.attrs as any)?.threadId || (commentMark.attrs as any)?.id;
        if (!threadId) return false;
        const el = document.getElementById(`thread-${threadId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          setActiveThreadId(threadId);
          window.setTimeout(() => setActiveThreadId((cur) => (cur === threadId ? null : cur)), 2000);
        }
        return false; // let Tiptap still place the cursor normally
      },
    },
  });

  if (!editor) return null;

  const unresolvedThreads = threads.filter((t) => !t.resolved);
  const aiThreads = unresolvedThreads.filter(
    (t) => t.comments[0]?.userId === AI_FEEDBACK_USER_ID
  );
  const humanThreads = unresolvedThreads.filter(
    (t) => t.comments[0]?.userId !== AI_FEEDBACK_USER_ID
  );

  return (
    <div className="doc-grid">
      <div className="doc-grid-toolbar">
        <PresenceBar />
        <div className="flex items-center gap-2">
          <ToolbarButton
            label="粗體"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            B
          </ToolbarButton>
          <ToolbarButton
            label="斜體"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <span className="italic">I</span>
          </ToolbarButton>
          <ToolbarButton
            label="底線"
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <span className="underline">U</span>
          </ToolbarButton>
          <ToolbarButton
            label="螢光標記"
            active={editor.isActive("highlight")}
            onClick={() => editor.chain().focus().toggleHighlight().run()}
          >
            <span className="w-4 h-4 rounded-sm bg-highlight inline-block" />
          </ToolbarButton>
          <ToolbarButton
            label="留言"
            active={false}
            onClick={() => editor.chain().focus().addPendingComment().run()}
          >
            💬
          </ToolbarButton>
          {lastSavedAt && (
            <span className="text-xs text-slate ml-1">
              最後儲存於{" "}
              {lastSavedAt.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {onSaveSnapshot && (
            <button
              type="button"
              onClick={async () => {
                const formData = new FormData();
                formData.set("content", editor.getText());
                formData.set("content_json", JSON.stringify(editor.getJSON()));
                const result = await onSaveSnapshot(formData);
                if (!result.success) {
                  // Errors must always surface to the UI, never fail
                  // silently.
                  onSaveErrorChange("版本儲存失敗，請稍後再試。");
                  return;
                }
                onSaveErrorChange(null);
                // The editor's own content is untouched by any of this —
                // saving only ever reads it into FormData, it never
                // clears or resets the document — so what's in the box
                // stays exactly as the user left it.
                onSnapshotSaved(result.snapshot);
              }}
              className="ml-auto rounded bg-ink px-3 py-1.5 text-xs font-semibold text-white"
            >
              💾 儲存版本
            </button>
          )}
          {onRequestAIFeedback && (
            <button
              type="button"
              disabled={aiLoading}
              onClick={async () => {
                setAiLoading(true);
                setAiError(null);
                const formData = new FormData();
                formData.set("essay_text", editor.getText());
                const result = await onRequestAIFeedback(formData);
                if (!result.success) setAiError(result.error);
                setAiLoading(false);
              }}
              className="rounded bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              {aiLoading ? "AI 分析中…" : "🤖 AI 回饋"}
            </button>
          )}
        </div>
      </div>

      {/* This row is what makes 評論 line up with the essay's hint text —
          both sit in the same CSS Grid row, so their top edges match
          regardless of exact content height on either side. */}
      <div className="doc-grid-hint">
        <p className="text-xs text-slate">選取文字後按下「💬」即可留言</p>
        {aiError && (
          <div className="rounded border border-danger/30 bg-danger-tint text-danger text-xs px-3 py-2 mt-2">
            {AI_ERROR_MESSAGES[aiError] || "發生錯誤，請稍後再試。"}
          </div>
        )}
        {saveError && (
          <div className="rounded border border-danger/30 bg-danger-tint text-danger text-xs px-3 py-2 mt-2">
            {saveError}
          </div>
        )}
      </div>
      <div className="doc-grid-sidebar-head">
        <h4 className="font-display font-bold text-sm">評論</h4>
      </div>

      {/* Same trick for the second row: the essay box and the comments
          box are both grid items in this row, so they start at the same
          height — that's the "inline with the start of the essay box"
          alignment, without needing to track each individual comment's
          position against its highlighted sentence (the fragile approach
          this project already tried and moved away from). */}
      <div className="doc-grid-editor">
        <div className="rounded border border-line bg-surface px-4 py-3 text-sm leading-relaxed focus-within:border-brand">
          <EditorContent editor={editor} />
        </div>
        <FloatingComposer editor={editor} />
        <SnapshotHistory snapshots={snapshots} basePath={basePath} activeSnapshotId={activeSnapshotId} />
      </div>

      <div className="doc-grid-sidebar-body relative max-h-[70vh] overflow-y-auto lg:sticky lg:top-4 flex flex-col gap-5 comments-sidebar">
        <div>
          {humanThreads.length === 0 ? (
            <p className="text-xs text-slate">尚無評論。</p>
          ) : (
            <div className="flex flex-col gap-3">
              {humanThreads.map((thread) => (
                <div
                  key={thread.id}
                  id={`thread-${thread.id}`}
                  className={`rounded border overflow-hidden transition-shadow ${
                    thread.id === activeThreadId
                      ? "border-brand ring-2 ring-brand"
                      : "border-line bg-surface"
                  }`}
                >
                  <Thread thread={thread} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded border border-brand/30 bg-brand-tint p-3">
          <h4 className="font-display font-bold text-sm mb-3">🤖 AI 回饋</h4>
          {aiThreads.length === 0 ? (
            <p className="text-xs text-slate">尚無 AI 回饋。</p>
          ) : (
            <div className="flex flex-col gap-3">
              {aiThreads.map((thread) => (
                <div key={thread.id} className="rounded border border-brand/20 bg-white overflow-hidden">
                  <Thread thread={thread} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        /* Two-row CSS Grid so the left (essay) and right (comments)
           columns line up at the same points — no JS/pixel measurement,
           just letting Grid compute row heights from real content. Single
           column on mobile, split into 1fr / 300px from lg breakpoint up,
           matching the old grid-cols-1 lg:grid-cols-[1fr_300px] behavior. */
        .doc-grid {
          display: grid;
          grid-template-columns: 1fr;
          row-gap: 0.5rem;
          grid-template-areas:
            "toolbar"
            "hint"
            "sidebar-head"
            "editor"
            "sidebar-body";
        }
        @media (min-width: 1024px) {
          .doc-grid {
            grid-template-columns: 1fr 300px;
            column-gap: 1.5rem;
            grid-template-areas:
              "toolbar toolbar"
              "hint sidebar-head"
              "editor sidebar-body";
          }
        }
        .doc-grid-toolbar {
          grid-area: toolbar;
        }
        .doc-grid-hint {
          grid-area: hint;
        }
        .doc-grid-sidebar-head {
          grid-area: sidebar-head;
        }
        .doc-grid-editor {
          grid-area: editor;
        }
        .doc-grid-sidebar-body {
          grid-area: sidebar-body;
        }

        .ProseMirror {
          outline: none;
          min-height: 12rem;
        }
        .ProseMirror p {
          margin: 0 0 0.75em 0;
        }
        .ProseMirror mark {
          background-color: rgba(255, 214, 10, 0.35);
          border-radius: 2px;
        }
        /* Liveblocks' own comment-anchor highlight (applied automatically
           when a comment is submitted via addPendingComment()/
           FloatingComposer) — recolored to a distinct orange so it doesn't
           read as the same thing as the yellow highlighter above. --lb-
           accent is now set on .doc-grid (not just .lb-root) because the
           editor content itself lives outside of any .lb-root wrapper —
           it's raw ProseMirror DOM — so the variable needs to cascade
           down from a shared ancestor to reach it. The class-name
           fallbacks below are a defensive net in case Liveblocks' actual
           mark class differs from these guesses — worth confirming
           visually after this batch. */
        .doc-grid {
          --lb-accent: 30 100% 50%;
        }
        .doc-grid .lb-tiptap-comment-highlight,
        .doc-grid [data-lb-comment-highlight],
        .doc-grid [data-highlight="true"] {
          background-color: rgba(255, 140, 0, 0.32) !important;
          cursor: pointer;
        }

        /* Force the comment sidebar's text to match the essay's own
           font-size/line-height/family (Liveblocks' <Thread> ships its
           own internal styling that renders noticeably larger than our
           text-sm essay body). Targeting every descendant of .lb-root
           with a tag-based wildcard, rather than guessing Liveblocks'
           specific internal class names, so this doesn't depend on us
           correctly reverse-engineering their DOM structure. */
        .comments-sidebar .lb-root,
        .comments-sidebar .lb-root * {
          font-size: 0.875rem !important;
          line-height: 1.625 !important;
          font-family: inherit !important;
        }
      `}</style>
    </div>
  );
}

function LoadingState() {
  return <p className="text-sm text-slate">連接即時協作文件中…</p>;
}

export function LiveDocument({
  roomId,
  onSaveSnapshot,
  onRequestAIFeedback,
  initialSnapshots,
  basePath,
  activeSnapshotId,
}: {
  roomId: string;
  onSaveSnapshot?: (
    formData: FormData
  ) => Promise<{ success: true; snapshot: SavedSnapshot } | { success: false; error: string }>;
  onRequestAIFeedback?: (
    formData: FormData
  ) => Promise<{ success: true } | { success: false; error: string }>;
  initialSnapshots: SnapshotInfo[];
  basePath: string;
  activeSnapshotId: string | null;
}) {
  // Deliberately kept HERE, not inside CollaborativeEditor: this component
  // is above <ClientSideSuspense>, so it isn't remounted by whatever
  // happens to the Liveblocks-dependent tree beneath it (a thread arriving
  // over the websocket, a reconnect, etc. — see the comment on
  // CollaborativeEditor). Snapshot state kept below that boundary was the
  // real reason the "最後儲存於" timestamp could revert to a stale value
  // after appearing to save correctly.
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>(initialSnapshots);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Liveblocks' own client SDK can throw an unhandled promise rejection
  // while resolving a thread it just heard about over its websocket
  // ("There was an error while getting thread th_...") — this happens
  // entirely inside node_modules/@liveblocks, is not something our own
  // code triggers or can catch with a normal try/catch, and the SDK
  // resyncs on its own right after (confirmed: the AI feedback that
  // triggered it still showed up correctly). Left unhandled, Next's dev
  // overlay treats it as a crash. This only silences that one specific,
  // already-recovered-from error message — anything else still surfaces
  // normally.
  useEffect(() => {
    function handleRejection(event: PromiseRejectionEvent) {
      const message = event.reason?.message || "";
      if (message.includes("error while getting thread")) {
        console.warn("[Liveblocks] transient thread-fetch error, ignored (SDK self-recovers):", message);
        event.preventDefault();
      }
    }
    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);

  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      resolveUsers={async ({ userIds }) => {
        // Only the synthetic AI user needs static resolution here — real
        // users' name/role/color already come through from the auth route
        // (app/api/liveblocks-auth/route.ts) at session time.
        return userIds.map((id) =>
          id === "ai-advisor" ? { name: "AI 顧問", color: "#3F6B4E" } : undefined
        );
      }}
    >
      <RoomProvider id={roomId} initialPresence={{}}>
        <ClientSideSuspense fallback={<LoadingState />}>
          <CollaborativeEditor
            onSaveSnapshot={onSaveSnapshot}
            onRequestAIFeedback={onRequestAIFeedback}
            snapshots={snapshots}
            onSnapshotSaved={(snapshot) => setSnapshots((prev) => [snapshot, ...prev])}
            basePath={basePath}
            activeSnapshotId={activeSnapshotId}
            saveError={saveError}
            onSaveErrorChange={setSaveError}
          />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
