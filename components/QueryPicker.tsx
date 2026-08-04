"use client";

import { useRouter } from "next/navigation";

export function QueryPicker({
  basePath,
  paramName,
  placeholder,
  options,
  activeId,
}: {
  basePath: string;
  paramName: string;
  placeholder: string;
  options: { id: string; label: string }[];
  activeId: string | null;
}) {
  const router = useRouter();

  return (
    <select
      value={activeId || ""}
      onChange={(e) => {
        const value = e.target.value;
        router.push(value ? `${basePath}?${paramName}=${value}` : basePath);
      }}
      className="appearance-none rounded border border-line pl-3 pr-9 py-2 text-sm outline-none focus:border-brand bg-white bg-no-repeat"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23172983' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 0.75rem center",
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
