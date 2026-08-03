import { SnapshotPicker } from "./SnapshotPicker";

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export interface SnapshotInfo {
  id: string;
  content: string;
  version: number;
  created_at: string;
}

export function SnapshotHistory({
  snapshots,
  basePath,
  activeSnapshotId,
}: {
  snapshots: SnapshotInfo[];
  basePath: string;
  activeSnapshotId: string | null;
}) {
  if (!snapshots || snapshots.length === 0) return null;

  const active = activeSnapshotId
    ? snapshots.find((s) => s.id === activeSnapshotId) || null
    : null;

  const options = snapshots.map((s) => ({
    id: s.id,
    label: `第 ${s.version} 份快照 — ${new Date(s.created_at).toLocaleString("zh-TW", {
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}（${wordCount(s.content)} 字）`,
  }));

  return (
    <div className="mt-8">
      <h4 className="font-display font-bold text-sm mb-2">版本歷史</h4>
      <SnapshotPicker basePath={basePath} options={options} activeId={activeSnapshotId} />

      <div className="mt-3 rounded border border-line bg-surface shadow-card p-4 min-h-[6rem]">
        {active ? (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {active.content || "（空白）"}
          </div>
        ) : (
          <p className="text-xs text-slate">從上方選單選擇一個版本，即可在這裡檢視內容。</p>
        )}
      </div>
      <p className="text-xs text-slate mt-2">
        這些舊版本會保留下來，以防不小心遺失內容 — 請在上方的主要編輯區塊進行實際編輯。
      </p>
    </div>
  );
}
