"use client";

import { useState } from "react";
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
  useOthers,
  useSelf,
} from "@liveblocks/react";
import { useThreads } from "@liveblocks/react/suspense";
import {
  useLiveblocksExtension,
  FloatingComposer,
  AnchoredThreads,
} from "@liveblocks/react-tiptap";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import "@liveblocks/react-ui/styles.css";
import "@liveblocks/react-tiptap/styles.css";

const AI_ERROR_MESSAGES: Record<string, string> = {
  essay_empty: "文件目前是空的，請先撰寫內容再請求 AI 回饋。",
  essay_too_short: "內容太短，請至少寫 30 個字再請求 AI 回饋。",
  ai_not_configured: "AI 回饋功能尚未設定完成，請聯絡系統管理者。",
  ai_request_failed: "AI 回饋請求失敗，請稍後再試。",
  ai_empty_response: "AI 未能產生回饋，請稍後再試。",
  comment_post_failed: "AI 回饋已產生，但留言失敗，請稍後再試。",
  not_authorized: "沒有權限對此文件請求 AI 回饋。",
  not_signed_in: "請重新登入後再試。",
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
  historySlot,
}: {
  onSaveSnapshot?: (formData: FormData) => void | Promise<void>;
  onRequestAIFeedback?: (
    formData: FormData
  ) => Promise<{ success: true } | { success: false; error: string }>;
  historySlot?: React.ReactNode;
}) {
  const liveblocksExtension = useLiveblocksExtension();
  const { threads } = useThreads();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

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
  });

  if (!editor) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
      <div>
        <PresenceBar />
        <div className="flex items-center gap-2 mb-2">
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
          <span className="text-xs text-slate ml-2">
            選取文字後按下「💬」即可留言
          </span>
          {onSaveSnapshot && (
            <button
              type="button"
              onClick={async () => {
                const formData = new FormData();
                formData.set("content", editor.getText());
                formData.set("content_json", JSON.stringify(editor.getJSON()));
                await onSaveSnapshot(formData);
              }}
              className="rounded bg-ink px-3 py-1.5 text-xs font-semibold text-white"
            >
              封存目前快照
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
              className="ml-auto rounded bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              {aiLoading ? "AI 分析中…" : "🤖 AI 回饋"}
            </button>
          )}
        </div>
        {aiError && (
          <div className="rounded border border-danger/30 bg-danger-tint text-danger text-xs px-3 py-2 mb-2">
            {AI_ERROR_MESSAGES[aiError] || "發生錯誤，請稍後再試。"}
          </div>
        )}
        <div className="rounded border border-line bg-surface px-4 py-3 text-sm leading-relaxed focus-within:border-brand">
          <EditorContent editor={editor} />
        </div>
        <FloatingComposer editor={editor} />

        {/* History lives in this same (left) column, not spanning the full
            page width — this is what makes it exactly as wide as the editor
            above it, rather than wider. */}
        {historySlot}
      </div>

      {/* This column is deliberately position:relative + overflow-y:auto
          with a bounded height. AnchoredThreads positions each comment card
          with an absolute "top" offset computed from the editor's content —
          without a contained, scrollable box here, a card anchored near the
          end of a long essay could render past this column's natural
          height and visually spill onto whatever comes after it on the
          page (the version history) — which is exactly what was happening
          before. */}
      <div className="relative max-h-[70vh] overflow-y-auto lg:sticky lg:top-4">
        <h4 className="font-display font-bold text-sm mb-3">評論</h4>
        {threads.filter((t) => !t.resolved).length === 0 ? (
          <p className="text-xs text-slate">尚無評論。</p>
        ) : (
          <AnchoredThreads editor={editor} threads={threads.filter((t) => !t.resolved)} />
        )}
      </div>

      <style jsx global>{`
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
  historySlot,
}: {
  roomId: string;
  onSaveSnapshot?: (formData: FormData) => void | Promise<void>;
  onRequestAIFeedback?: (
    formData: FormData
  ) => Promise<{ success: true } | { success: false; error: string }>;
  historySlot?: React.ReactNode;
}) {
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
            historySlot={historySlot}
          />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
