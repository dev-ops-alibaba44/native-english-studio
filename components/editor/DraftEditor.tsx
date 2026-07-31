"use client";

import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import { useEffect } from "react";
import {
  CommentDecorations,
  applyCommentDecorations,
  type CommentRange,
} from "./comment-decorations";
import { ReadOnlyGuard } from "./read-only-guard";

// Old drafts (pre-Batch 8) only have plain text, no content_json yet.
// Split on blank lines into paragraphs so they still render sensibly.
export function plainTextToDoc(text: string): JSONContent {
  const paragraphs = (text || "").split(/\n{2,}|\n/).filter((p) => p.length > 0);
  if (paragraphs.length === 0) {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }
  return {
    type: "doc",
    content: paragraphs.map((p) => ({
      type: "paragraph",
      content: [{ type: "text", text: p }],
    })),
  };
}

function docToPlainText(json: JSONContent): string {
  const lines: string[] = [];
  function walk(node: JSONContent) {
    if (node.type === "text" && node.text) {
      lines[lines.length - 1] = (lines[lines.length - 1] || "") + node.text;
    }
    if (node.type === "paragraph") lines.push("");
    node.content?.forEach(walk);
  }
  (json.content || []).forEach(walk);
  return lines.join("\n");
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

export function DraftEditor({
  content,
  editable,
  comments,
  activeCommentId,
  onChange,
  onSelectionForComment,
  onCommentClick,
}: {
  content: JSONContent | string;
  editable: boolean;
  comments?: CommentRange[];
  activeCommentId?: string | null;
  onChange?: (json: JSONContent, plainText: string) => void;
  onSelectionForComment?: (sel: { from: number; to: number; text: string }) => void;
  onCommentClick?: (commentId: string) => void;
}) {
  const initialContent =
    typeof content === "string" ? plainTextToDoc(content) : content;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Underline,
      Highlight.configure({ multicolor: false }),
      CommentDecorations,
      ReadOnlyGuard.configure({ blockEdits: !editable }),
    ],
    content: initialContent,
    // Always genuinely editable at the DOM level — even in "review" mode —
    // so native browser text selection (double-click word select, drag
    // select) behaves correctly. ReadOnlyGuard blocks actual edits when
    // `editable` (the write-mode flag) is false; see read-only-guard.ts.
    editable: true,
    editorProps: {
      attributes: {
        spellcheck: editable ? "true" : "false",
      },
    },
    immediatelyRender: false,
    onUpdate({ editor }) {
      onChange?.(editor.getJSON(), docToPlainText(editor.getJSON()));
    },
    onSelectionUpdate({ editor }) {
      if (!onSelectionForComment) return;
      const { from, to, empty } = editor.state.selection;
      if (empty) return;
      const text = editor.state.doc.textBetween(from, to, " ");
      if (text.trim().length === 0) return;
      onSelectionForComment({ from, to, text });
    },
  });

  // Recompute comment highlight decorations whenever the comment list or
  // active selection changes (not on every keystroke — only these deps).
  useEffect(() => {
    if (!editor || editable) return;
    applyCommentDecorations(editor, comments || [], activeCommentId ?? null);
  }, [editor, editable, comments, activeCommentId]);

  // Let clicking a highlighted span jump to that comment in the sidebar.
  useEffect(() => {
    if (!editor || !onCommentClick) return;
    const dom = editor.view.dom;
    const handler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-comment-id]");
      const id = target?.getAttribute("data-comment-id");
      if (id) onCommentClick(id);
    };
    dom.addEventListener("click", handler);
    return () => dom.removeEventListener("click", handler);
  }, [editor, onCommentClick]);

  if (!editor) return null;

  return (
    <div>
      {editable && (
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
        </div>
      )}
      <div
        data-mode={editable ? "write" : "review"}
        className={`rounded border border-line px-4 py-3 text-sm leading-relaxed ${
          editable ? "focus-within:border-brand" : "bg-surface"
        }`}
      >
        <EditorContent editor={editor} />
      </div>
      <style jsx global>{`
        .ProseMirror {
          outline: none;
          min-height: 8rem;
        }
        .ProseMirror p {
          margin: 0 0 0.75em 0;
        }
        .ProseMirror mark {
          background-color: rgba(255, 214, 10, 0.35);
          border-radius: 2px;
        }
        [data-mode="review"] .ProseMirror {
          caret-color: transparent;
        }
        .comment-anchor {
          background-color: rgba(221, 14, 32, 0.12);
          border-bottom: 2px solid #dd0e20;
          cursor: pointer;
        }
        .comment-anchor-active {
          background-color: rgba(221, 14, 32, 0.24);
        }
        .highlight-anchor {
          background-color: rgba(255, 214, 10, 0.45);
          cursor: pointer;
        }
        .highlight-anchor-active {
          background-color: rgba(255, 214, 10, 0.7);
        }
      `}</style>
    </div>
  );
}
