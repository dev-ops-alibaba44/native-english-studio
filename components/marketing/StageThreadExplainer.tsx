import { STAGE_ORDER, STAGE_LABELS } from "@/lib/stages";

// A static, "explain the whole journey" version of the six-stage motif —
// distinct from components/StageThread.tsx, which shows one specific
// application's current position and is used inside the portals. This one
// always shows all six stages as equally complete, since it's explaining
// the process itself rather than tracking a real application.

const STAGE_DESCRIPTIONS: Record<(typeof STAGE_ORDER)[number], string> = {
  brainstorm: "透過引導式提問與 AI 輔助，找到值得寫的故事與角度。",
  outline: "把想法整理成結構，確認每個段落要傳達的重點。",
  draft: "完成第一版全文，讓文字先落地，再回頭打磨。",
  advisor_feedback: "顧問在文件中直接留言、標註，回饋清楚可追蹤。",
  revision: "根據回饋修訂，多輪版本都留下記錄，不怕改壞。",
  final: "定稿，準備好隨申請一起送出。",
};

export function StageThreadExplainer() {
  return (
    <section className="border-y border-line bg-brand-tint">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
          六個階段，一路陪伴到定稿
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate">
          從發想到定稿，每一步都在平台上完成，顧問與機構隨時可以看到每位學生走到哪裡。
        </p>

        <div className="mt-12 flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-4">
          {STAGE_ORDER.map((stage, i) => (
            <div key={stage} className="flex flex-1 gap-4 sm:flex-col sm:gap-3">
              <div className="flex shrink-0 flex-col items-center sm:w-full">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand font-util text-sm font-bold text-white">
                  {i + 1}
                </div>
                {i < STAGE_ORDER.length - 1 && (
                  <div
                    className="mt-1.5 w-0.5 flex-1 bg-line sm:mt-0 sm:h-0.5 sm:w-full"
                    aria-hidden="true"
                  />
                )}
              </div>
              <div className="pb-2 sm:pb-0">
                <div className="font-display text-sm font-bold text-ink">
                  {STAGE_LABELS[stage]}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate">
                  {STAGE_DESCRIPTIONS[stage]}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
