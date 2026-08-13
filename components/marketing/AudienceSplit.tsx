import Link from "next/link";

export function AudienceSplit() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
      <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
        您是哪一種身份？
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate">
        Native English Studio 主要與留學顧問機構合作；若您是學生或家長，也歡迎先留下資訊，我們會通知您後續進展。
      </p>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {/* Agency path */}
        <div className="flex flex-col rounded border border-line bg-surface p-8 shadow-card">
          <div className="text-xs font-semibold uppercase tracking-wide text-brand">
            機構 / 顧問中心
          </div>
          <h3 className="mt-2 font-display text-xl font-bold text-ink">
            機構授權方案
          </h3>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-slate">
            以年度授權加上人數計費，為您的顧問團隊與學生提供完整平台——協作編輯、AI
            輔助、學生檔案與進度總覽，一次到位。適合留學顧問公司、補習班的申請輔導部門。
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-ink">
            <li>· 顧問與機構管理者專屬儀表板</li>
            <li>· 依人數彈性計費，無須採購個別帳號</li>
            <li>· 專人協助建置與帳號設定</li>
          </ul>
          <Link
            href="/signup/agency"
            className="mt-6 rounded bg-ink px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand transition-colors"
          >
            洽詢機構方案 →
          </Link>
        </div>

        {/* Individual path */}
        <div className="flex flex-col rounded border border-line bg-surface p-8 shadow-card">
          <div className="text-xs font-semibold uppercase tracking-wide text-brand">
            學生 / 家長
          </div>
          <h3 className="mt-2 font-display text-xl font-bold text-ink">
            個人與家長候補名單
          </h3>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-slate">
            目前平台主要透過合作機構提供服務。若您不透過機構、想直接為自己或孩子使用
            Native English Studio，請先留下聯絡方式，開放個人使用時我們會優先通知您。
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-ink">
            <li>· 開放時第一時間收到通知</li>
            <li>· 協助了解目前有哪些合作機構</li>
            <li>· 不需要任何付款資訊</li>
          </ul>
          <Link
            href="/signup/individual"
            className="mt-6 rounded border border-line bg-surface px-5 py-2.5 text-center text-sm font-semibold text-ink hover:border-brand hover:text-brand transition-colors"
          >
            加入候補名單 →
          </Link>
        </div>
      </div>
    </section>
  );
}
