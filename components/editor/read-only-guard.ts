import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";

/**
 * Why this exists: setting Tiptap's `editable: false` sets contentEditable
 * to false on the DOM, and browsers handle native selection (especially
 * double-click-to-select-word) unreliably on non-editable regions — this is
 * what caused single-character selections when advisors tried to select a
 * whole word to comment on. The fix is to keep the DOM genuinely editable
 * (so the browser's own selection behavior works correctly) and instead
 * block edits at the ProseMirror transaction level.
 */
export const ReadOnlyGuard = Extension.create<{ blockEdits: boolean }>({
  name: "readOnlyGuard",

  addOptions() {
    return { blockEdits: false };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    return [
      new Plugin({
        filterTransaction(tr) {
          if (!options.blockEdits) return true;
          // Allow selection-only transactions (and our own decoration
          // meta-transactions); block anything that actually edits the doc.
          return !tr.docChanged;
        },
      }),
    ];
  },
});
