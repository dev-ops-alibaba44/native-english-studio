import Image from "next/image";

const SHOTS = [
  {
    src: "/screenshots/brainstorm.jpg",
    title: "AI 輔助腦力激盪",
    body: "從發想階段開始，AI 用具體的提問幫學生把想法挖得更深——不會幫忙寫句子，只是引導思考。",
    width: 1176,
    height: 1036,
  },
  {
    src: "/screenshots/feedback.jpg",
    title: "即時協作與顧問回饋",
    body: "學生與顧問在同一份文件裡即時共同編輯，留言直接標註在文字上，討論脈絡清楚可循。",
    width: 1288,
    height: 940,
  },
  {
    src: "/screenshots/portfolio.jpg",
    title: "完整學習檔案",
    body: "成績、測驗分數、課外活動整合在同一個地方，申請時直接引用，不必每次重新整理。",
    width: 1185,
    height: 680,
  },
];

export function ProductShowcase() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
      <div className="text-xs font-semibold uppercase tracking-wide text-brand">
        實際畫面
      </div>
      <h2 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">
        平台裡，實際的樣子
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate">
        沒有示意圖，這些都是平台裡真實的畫面。
      </p>

      <div className="mt-10 space-y-14">
        {SHOTS.map((shot, i) => (
          <div
            key={shot.src}
            className={`flex flex-col gap-6 sm:items-center sm:gap-10 lg:flex-row ${
              i % 2 === 1 ? "lg:flex-row-reverse" : ""
            }`}
          >
            <div className="overflow-hidden rounded border border-line shadow-card lg:w-3/5">
              <Image
                src={shot.src}
                alt={shot.title}
                width={shot.width}
                height={shot.height}
                className="w-full"
              />
            </div>
            <div className="lg:w-2/5">
              <h3 className="font-display text-lg font-bold text-ink">
                {shot.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate">
                {shot.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
