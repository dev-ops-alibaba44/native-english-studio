"use client";

import { useRouter } from "next/navigation";

export function SnapshotPicker({
  basePath,
  options,
  activeId,
}: {
  basePath: string;
  options: { id: string; label: string }[];
  activeId: string | null;
}) {
  const router = useRouter();

  return (
    <select
      value={activeId || ""}
      onChange={(e) => {
        const value = e.target.value;
        router.push(value ? `${basePath}?snapshot=${value}` : basePath);
      }}
      className="rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand bg-white"
    >
      <option value="">查看版本歷史</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
