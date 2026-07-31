"use client";

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
}: {
  onSaveSnapshot?: (formData: FormData) => void | Promise<void>;
}) {
  const liveblocksExtension = useLiveblocksExtension();
  const { threads } = useThreads();

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
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
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
          <span className="text-xs text-slate ml-2">
            選取文字後可留言（右側會出現評論框）
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
              className="ml-auto rounded bg-ink px-3 py-1.5 text-xs font-semibold text-white"
            >
              封存目前快照
            </button>
          )}
        </div>
        <div className="rounded border border-line bg-surface px-4 py-3 text-sm leading-relaxed focus-within:border-brand">
          <EditorContent editor={editor} />
        </div>
        <FloatingComposer editor={editor} />
      </div>

      <div>
        <h4 className="font-display font-bold text-sm mb-3">評論</h4>
        <AnchoredThreads editor={editor} threads={threads} />
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
}: {
  roomId: string;
  onSaveSnapshot?: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider id={roomId} initialPresence={{}}>
        <ClientSideSuspense fallback={<LoadingState />}>
          <CollaborativeEditor onSaveSnapshot={onSaveSnapshot} />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
