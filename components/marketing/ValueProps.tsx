const FEATURES = [
  {
    title: "即時協作編輯",
    body: "學生與顧問在同一份文件裡即時共同編輯、留言、標註，就像使用 Google 文件一樣直覺，不再需要來回寄送不同版本的檔案。",
  },
  {
    title: "AI 輔助腦力激盪與回饋",
    body: "從發想階段的引導提問，到初稿完成後的 AI 回饋，全程支援繁體中文輸出，幫助學生更快找到方向，也減輕顧問的初步審閱負擔。",
  },
  {
    title: "完整學習檔案管理",
    body: "成績、測驗分數、課外活動、獎項，整合成一份完整的學生學習檔案，申請時直接引用，不必每次重新整理。",
  },
  {
    title: "機構總覽儀表板",
    body: "顧問與機構管理者可以掌握每位學生的進度、截止日期、AI 使用狀況，重要事項一目了然，不遺漏任何一份文書。",
  },
];

export function ValueProps() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
      <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
        一個平台，取代分散的流程
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate">
        把文書協作、AI 輔助、學生檔案管理整合在一起，讓機構把心力放在真正重要的事——輔導學生寫出好的文書。
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded border border-line bg-surface p-6 shadow-card"
          >
            <h3 className="font-display text-base font-bold text-ink">
              {f.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate">
              {f.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
