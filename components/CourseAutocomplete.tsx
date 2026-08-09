"use client";

import { useEffect, useRef, useState } from "react";
import { searchCourseCatalog, addCustomCourse, type CourseMatch } from "@/app/actions/grades";

export function CourseAutocomplete({
  value,
  onSelect,
}: {
  // Current course name text for this row (controlled from the parent
  // GradesEditor, since the row itself lives in that component's state).
  value: string;
  // Called with the chosen name and, if it came from the catalog, its id
  // (kept for usage-count tracking / future curation) — id is null for a
  // manually-typed name that was never matched or added.
  onSelect: (name: string, courseId: string | null) => void;
}) {
  const [query, setQuery] = useState(value);
  const [matches, setMatches] = useState<CourseMatch[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(text: string) {
    setQuery(text);
    onSelect(text, null); // typing freely un-links any previous catalog match
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 1) {
      setMatches([]);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchCourseCatalog(text);
      setMatches(results);
      setSearching(false);
    }, 250);
  }

  async function handleAddNew() {
    const result = await addCustomCourse(query);
    if (result.success) {
      setQuery(result.course.name_en);
      onSelect(result.course.name_en, result.course.id);
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
        placeholder="輸入科目名稱（中文或英文皆可）"
        className="w-full rounded border border-line px-2 py-1.5 text-sm outline-none focus:border-brand"
      />
      {open && query.trim().length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded border border-line bg-white shadow-card">
          {searching && <div className="px-3 py-2 text-xs text-slate">搜尋中…</div>}
          {!searching && matches.length === 0 && (
            <button
              type="button"
              onClick={handleAddNew}
              className="w-full text-left px-3 py-2 text-sm text-brand hover:bg-brand-tint"
            >
              ➕ 新增「{query}」
            </button>
          )}
          {!searching &&
            matches.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setQuery(m.name_en);
                  onSelect(m.name_en, m.id);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-brand-tint"
              >
                <span className="font-medium">{m.name_en}</span>
                {m.name_zh && m.name_zh !== m.name_en && (
                  <span className="text-slate"> — {m.name_zh}</span>
                )}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
