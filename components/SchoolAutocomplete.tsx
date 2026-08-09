"use client";

import { useEffect, useRef, useState } from "react";
import { searchSchoolCatalog, addCustomSchool, type SchoolMatch } from "@/app/actions/grades";

export function SchoolAutocomplete({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (name: string, schoolId: string | null) => void;
}) {
  const [query, setQuery] = useState(value);
  const [matches, setMatches] = useState<SchoolMatch[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function runSearch(text: string) {
    const seq = ++requestSeq.current;
    setSearching(true);
    searchSchoolCatalog(text).then((results) => {
      if (seq !== requestSeq.current) return;
      setMatches(results);
      setSearching(false);
    });
  }

  function handleChange(text: string) {
    const wasEmpty = query.trim().length === 0;
    setQuery(text);
    onSelect(text, null);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = text.trim();
    if (trimmed.length < 1) {
      setMatches([]);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(trimmed), wasEmpty ? 40 : 120);
  }

  async function handleAddNew() {
    const result = await addCustomSchool(query);
    if (result.success) {
      setQuery(result.school.name_zh);
      onSelect(result.school.name_zh, result.school.id);
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="輸入學校名稱（中文或英文皆可）"
        className="w-full rounded border border-line px-2 py-1.5 text-sm outline-none focus:border-brand"
      />
      {open && query.trim().length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded border border-line bg-white shadow-card">
          {searching && matches.length === 0 && <div className="px-3 py-2 text-xs text-slate">搜尋中…</div>}
          {!searching && matches.length === 0 && (
            <button
              type="button"
              onClick={handleAddNew}
              className="w-full text-left px-3 py-2 text-sm text-brand hover:bg-brand-tint"
            >
              ➕ 新增「{query}」
            </button>
          )}
          {matches.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setQuery(m.name_zh);
                onSelect(m.name_zh, m.id);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-brand-tint"
            >
              <span className="font-medium">{m.name_zh}</span>
              {m.name_en && <span className="text-slate"> — {m.name_en}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
