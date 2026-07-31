import Link from "next/link";

export interface SectionInfo {
  id: string;
  title: string;
  prompt_text: string | null;
  word_limit: number | null;
}

export function SectionTabs({
  basePath,
  sections,
  activeSectionId,
  addSectionAction,
}: {
  basePath: string;
  sections: SectionInfo[];
  activeSectionId: string | null;
  addSectionAction: (formData: FormData) => void | Promise<void>;
}) {
  const activeSection = activeSectionId
    ? sections.find((s) => s.id === activeSectionId) || null
    : null;

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Link
          href={basePath}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
            !activeSectionId
              ? "bg-brand text-white border-brand"
              : "bg-white text-ink border-line hover:border-brand"
          }`}
        >
          主要文件
        </Link>
        {sections.map((s) => (
          <Link
            key={s.id}
            href={`${basePath}?section=${s.id}`}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
              activeSectionId === s.id
                ? "bg-brand text-white border-brand"
                : "bg-white text-ink border-line hover:border-brand"
            }`}
          >
            {s.title}
          </Link>
        ))}
        <details className="inline-block">
          <summary className="cursor-pointer text-xs text-brand underline select-none px-1 py-1.5">
            + 新增段落
          </summary>
          <form
            action={addSectionAction}
            className="mt-2 rounded border border-line bg-surface shadow-card p-3 flex flex-col gap-2 max-w-sm"
          >
            <input
              name="title"
              required
              placeholder="段落名稱，例如：Why NYU?"
              className="rounded border border-line px-3 py-1.5 text-sm outline-none focus:border-brand"
            />
            <textarea
              name="prompt_text"
              rows={2}
              placeholder="題目（選填）"
              className="rounded border border-line px-3 py-1.5 text-sm outline-none focus:border-brand"
            />
            <input
              name="word_limit"
              type="number"
              placeholder="字數上限（選填）"
              className="rounded border border-line px-3 py-1.5 text-sm outline-none focus:border-brand"
            />
            <button
              type="submit"
              className="rounded bg-ink px-3 py-1.5 text-xs font-semibold text-white self-start"
            >
              新增
            </button>
          </form>
        </details>
      </div>
      {activeSection?.prompt_text && (
        <p className="text-sm text-slate">{activeSection.prompt_text}</p>
      )}
      {activeSection?.word_limit && (
        <p className="text-xs text-slate">{activeSection.word_limit} 字上限</p>
      )}
    </div>
  );
}
