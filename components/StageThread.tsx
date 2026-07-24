import { STAGE_ORDER, STAGE_LABELS, type Stage } from "@/lib/stages";

export function StageThread({
  stage,
  size = "md",
}: {
  stage: Stage;
  size?: "sm" | "md";
}) {
  const currentIndex = STAGE_ORDER.indexOf(stage);

  return (
    <div className="flex items-center w-full">
      {STAGE_ORDER.map((s, i) => {
        const done = i < currentIndex;
        const current = i === currentIndex;
        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            {i > 0 && (
              <div
                className={`h-0.5 flex-1 ${i <= currentIndex ? "bg-brand" : "bg-line"}`}
              />
            )}
            <div className="flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full border-2 shrink-0 ${
                  done
                    ? "bg-brand border-brand"
                    : current
                    ? "bg-white border-brand"
                    : "bg-slate-light border-line"
                }`}
                style={current ? { boxShadow: "0 0 0 4px rgba(23,41,131,0.14)" } : undefined}
              />
              {size === "md" && (
                <div
                  className={`text-[10px] mt-1.5 font-util whitespace-nowrap ${
                    done || current ? "text-ink font-semibold" : "text-slate"
                  }`}
                >
                  {STAGE_LABELS[s]}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
