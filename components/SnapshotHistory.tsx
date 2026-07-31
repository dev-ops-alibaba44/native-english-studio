function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export interface SnapshotInfo {
  id: string;
  content: string;
  version: number;
  created_at: string;
}

export function SnapshotHistory({ snapshots }: { snapshots: SnapshotInfo[] }) {
  if (!snapshots || snapshots.length === 0) return null;

  return (
    <details className="text-sm mt-8">
      <summary className="cursor-pointer text-xs text-slate select-none">
        查看歷史快照（共 {snapshots.length} 份）
      </summary>
      <div className="rounded border border-line bg-surface shadow-card divide-y divide-line mt-2">
        {snapshots.map((s) => (
          <details key={s.id} className="group">
            <summary className="p-3 flex items-center justify-between cursor-pointer list-none hover:bg-brand-tint">
              <span className="text-sm font-semibold">
                第 {s.version} 份快照
                <span className="text-xs font-normal text-slate ml-2 group-open:hidden">
                  （點選查看內容）
                </span>
              </span>
              <span className="text-xs text-slate">
                {new Date(s.created_at).toLocaleString("zh-TW")} · {wordCount(s.content)} 字
              </span>
            </summary>
            <div className="px-4 pb-4 text-sm leading-relaxed whitespace-pre-wrap border-t border-line pt-3">
              {s.content || "（空白）"}
            </div>
          </details>
        ))}
      </div>
    </details>
  );
}
