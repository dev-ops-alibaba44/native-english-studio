import Image from "next/image";

// Real product screenshots, in the order they'd naturally come up in a
// student's workflow: brainstorming (both sides) → collaborative feedback
// → staying on top of deadlines → the four 學習檔案 sections. Widths/
// heights match the actual saved files exactly, since a CSS multi-column
// masonry (below) relies on each image's real aspect ratio to lay out well.
const SHOTS = [
  {
    src: "/screenshots/brainstorm-student.jpg",
    title: "AI 腦力激盪 — 學生端",
    body: "從幾個具體的問題開始，AI 幫學生把想法挖得更深，不會幫忙寫句子。",
    width: 1120,
    height: 1092,
  },
  {
    src: "/screenshots/brainstorm-advisor.jpg",
    title: "AI 腦力激盪 — 顧問端",
    body: "顧問可以同步看到學生的想法與過去的對話紀錄，隨時接手討論。",
    width: 1176,
    height: 1036,
  },
  {
    src: "/screenshots/essay-feedback.jpg",
    title: "即時協作與顧問回饋",
    body: "學生與顧問在同一份文件裡即時共同編輯，留言直接標註在文字上。",
    width: 1120,
    height: 1092,
  },
  {
    src: "/screenshots/calendar.jpg",
    title: "掌握每個申請的時程",
    body: "每位學生所有申請項目的階段與截止日一覽無遺，不遺漏任何一份文書。",
    width: 1232,
    height: 980,
  },
  {
    src: "/screenshots/ai-assessment.jpg",
    title: "學習檔案與 AI 綜合評估",
    body: "成績、測驗分數、活動整合在同一個地方，AI 提供加強建議與學校方向參考。",
    width: 1120,
    height: 706,
  },
  {
    src: "/screenshots/test-scores.jpg",
    title: "測驗成績總覽",
    body: "AP、IB、語言測驗分開填寫，一目瞭然，重考也能保留每一筆紀錄。",
    width: 1008,
    height: 1204,
  },
  {
    src: "/screenshots/grades.jpg",
    title: "成績管理",
    body: "依學校的學制與成績表示方式自動配合調整，百分制、等第制都支援。",
    width: 1148,
    height: 1064,
  },
  {
    src: "/screenshots/activities.jpg",
    title: "課外活動紀錄",
    body: "活動、時數、簡短描述，讓 AI 之後能看出學生的投入程度。",
    width: 1204,
    height: 700,
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

      <div className="mt-10 columns-1 gap-5 sm:columns-2 lg:columns-3">
        {SHOTS.map((shot) => (
          <figure
            key={shot.src}
            className="mb-5 break-inside-avoid overflow-hidden rounded border border-line bg-surface shadow-card"
          >
            <Image
              src={shot.src}
              alt={shot.title}
              width={shot.width}
              height={shot.height}
              className="w-full"
            />
            <figcaption className="p-4">
              <div className="font-display text-sm font-bold text-ink">
                {shot.title}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate">
                {shot.body}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
