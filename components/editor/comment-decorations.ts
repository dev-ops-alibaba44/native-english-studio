import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Editor } from "@tiptap/core";

export const commentDecorationsPluginKey = new PluginKey("commentDecorations");

export interface CommentRange {
  id: string;
  range_from: number;
  range_to: number;
  kind?: "comment" | "highlight";
}

/**
 * Renders a highlight span for every comment's anchored range, plus an
 * extra "active" style for whichever comment is currently selected in the
 * sidebar. Purely visual — never touches the document, so this is safe to
 * use on read-only (editable: false) editors showing an immutable draft.
 */
export const CommentDecorations = Extension.create({
  name: "commentDecorations",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: commentDecorationsPluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, old) {
            const meta = tr.getMeta(commentDecorationsPluginKey);
            if (meta) return meta;
            return old.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

export function applyCommentDecorations(
  editor: Editor,
  comments: CommentRange[],
  activeCommentId: string | null
) {
  const doc = editor.state.doc;
  const docSize = doc.content.size;
  const decorations: Decoration[] = [];

  for (const c of comments) {
    if (c.range_from == null || c.range_to == null) continue;
    const from = Math.max(0, Math.min(c.range_from, docSize));
    const to = Math.max(from, Math.min(c.range_to, docSize));
    if (from === to) continue;
    const isActive = c.id === activeCommentId;
    const isHighlight = c.kind === "highlight";
    const baseClass = isHighlight ? "highlight-anchor" : "comment-anchor";
    decorations.push(
      Decoration.inline(from, to, {
        class: isActive ? `${baseClass} ${baseClass}-active` : baseClass,
        "data-comment-id": c.id,
      })
    );
  }

  const decorationSet = DecorationSet.create(doc, decorations);
  const tr = editor.state.tr.setMeta(commentDecorationsPluginKey, decorationSet);
  editor.view.dispatch(tr);
}
