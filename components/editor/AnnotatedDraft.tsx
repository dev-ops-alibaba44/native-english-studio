"use client";

import { useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { DraftEditor } from "./DraftEditor";

export interface DraftComment {
  id: string;
  body: string;
  anchor_text: string | null;
  range_from: number | null;
  range_to: number | null;
  kind: "comment" | "highlight";
  created_at: string;
  author_display_name: string | null;
}

export function AnnotatedDraft({
  content,
  comments,
  onAddComment,
  canComment,
}: {
  content: JSONContent | string;
  comments: DraftComment[];
  onAddComment?: (formData: FormData) => void | Promise<void>;
  canComment: boolean;
}) {
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [pendingSelection, setPendingSelection] = useState<
    { from: number; to: number; text: string } | null
  >(null);
  const [composingComment, setComposingComment] = useState(false);
  const [showGeneralComment, setShowGeneralComment] = useState(false);

  const commentRanges = comments
    .filter((c) => c.range_from != null && c.range_to != null)
    .map((c) => ({
      id: c.id,
      range_from: c.range_from as number,
      range_to: c.range_to as number,
      kind: c.kind,
    }));

  async function submitHighlight() {
    if (!pendingSelection) return;
    const formData = new FormData();
    formData.set("range_from", String(pendingSelection.from));
    formData.set("range_to", String(pendingSelection.to));
    formData.set("anchor_text", pendingSelection.text);
    formData.set("kind", "highlight");
    formData.set("body", "");
    await onAddComment?.(formData);
    setPendingSelection(null);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
      <div>
        <DraftEditor
          content={content}
          editable={false}
          comments={commentRanges}
          activeCommentId={activeCommentId}
          onCommentClick={(id) => setActiveCommentId(id)}
          onSelectionForComment={
            canComment
              ? (sel) => {
                  setPendingSelection(sel);
                  setComposingComment(false);
                }
              : undefined
          }
        />

        {canComment && pendingSelection && !composingComment && (
          <div className="mt-2 flex items-center gap-2 rounded border border-brand/30 bg-brand-tint p-2">
            <span className="text-xs text-slate px-1">
              已選取「{pendingSelection.text.length > 30
                ? pendingSelection.text.slice(0, 30) + "…"
                : pendingSelection.text}
              」：
            </span>
            <button
              type="button"
              onClick={submitHighlight}
              className="rounded bg-highlight px-3 py-1.5 text-xs font-semibold text-ink"
            >
              醒目提示
            </button>
            <button
              type="button"
              onClick={() => setComposingComment(true)}
              className="rounded bg-ink px-3 py-1.5 text-xs font-semibold text-white"
            >
              留言
            </button>
            <button
              type="button"
              onClick={() => setPendingSelection(null)}
              className="text-xs text-slate ml-auto"
            >
              取消
            </button>
          </div>
        )}

        {canComment && pendingSelection && composingComment && (
          <form
            action={async (formData) => {
              formData.set("kind", "comment");
              await onAddComment?.(formData);
              setPendingSelection(null);
              setComposingComment(false);
            }}
            className="mt-2 rounded border border-brand/30 bg-brand-tint p-4"
          >
            <input type="hidden" name="range_from" value={pendingSelection.from} />
            <input type="hidden" name="range_to" value={pendingSelection.to} />
            <input type="hidden" name="anchor_text" value={pendingSelection.text} />
            <div className="text-xs italic text-slate mb-2">
              針對「{pendingSelection.text.slice(0, 60)}
              {pendingSelection.text.length > 60 ? "…" : ""}」
            </div>
            <textarea
              name="body"
              required
              rows={2}
              autoFocus
              className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand mb-2"
              placeholder="針對這段文字寫下你的建議……"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="rounded bg-ink px-3 py-1.5 text-xs font-semibold text-white"
              >
                送出評論
              </button>
              <button
                type="button"
                onClick={() => {
                  setComposingComment(false);
                  setPendingSelection(null);
                }}
                className="text-xs text-slate"
              >
                取消
              </button>
            </div>
          </form>
        )}

        {canComment && !pendingSelection && (
          <div className="mt-2">
            <p className="text-xs text-slate mb-2">
              提示：在上方草稿中反白選取文字，即可醒目提示或留言。
            </p>
            {showGeneralComment ? (
              <form
                action={async (formData) => {
                  formData.set("kind", "comment");
                  await onAddComment?.(formData);
                  setShowGeneralComment(false);
                }}
                className="rounded border border-line bg-surface p-4"
              >
                <textarea
                  name="body"
                  required
                  rows={2}
                  autoFocus
                  className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand mb-2"
                  placeholder="不特別針對某段文字的整體回饋……"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="rounded bg-ink px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    送出評論
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGeneralComment(false)}
                    className="text-xs text-slate"
                  >
                    取消
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowGeneralComment(true)}
                className="text-xs text-brand underline"
              >
                + 新增整體評論（不指定段落）
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h4 className="font-display font-bold text-sm">評論與標記（{comments.length}）</h4>
        {comments.length === 0 ? (
          <p className="text-xs text-slate">尚無評論或標記。</p>
        ) : (
          comments.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCommentId(c.id === activeCommentId ? null : c.id)}
              className={`text-left rounded border p-3 ${
                activeCommentId === c.id
                  ? "border-brand bg-brand-tint"
                  : "border-line bg-surface hover:border-brand/50"
              }`}
            >
              {c.kind === "highlight" ? (
                <div className="text-xs font-semibold text-ink mb-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-highlight align-middle mr-1" />
                  醒目提示 — {c.author_display_name || "顧問"}
                </div>
              ) : (
                <>
                  {c.anchor_text && (
                    <div className="text-xs italic text-slate mb-1 line-clamp-2">
                      針對「{c.anchor_text}」
                    </div>
                  )}
                  <div className="text-xs font-bold text-brand mb-1">
                    {c.author_display_name || "顧問"}
                  </div>
                  <div className="text-sm leading-relaxed">{c.body}</div>
                </>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
