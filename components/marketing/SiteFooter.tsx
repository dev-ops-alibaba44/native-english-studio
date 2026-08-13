import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="font-display text-base font-bold text-ink">
              Native English Studio
            </div>
            <p className="mt-1 text-sm text-slate">
              為留學申請顧問機構打造的協作式文書平台
            </p>
          </div>

          <div className="flex flex-col gap-1 text-sm text-slate sm:items-end">
            <a
              href="mailto:info@nativeenglish.ca"
              className="hover:text-brand"
            >
              info@nativeenglish.ca
            </a>
            <div className="flex flex-wrap justify-end gap-x-4 gap-y-1">
              <Link href="/signup/agency" className="hover:text-brand">
                機構方案洽詢
              </Link>
              <Link href="/signup/individual" className="hover:text-brand">
                學生與家長候補
              </Link>
              <Link href="/login" className="hover:text-brand">
                登入
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate">
            © 2026 Native English Ltd. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate">
            <Link href="/legal/privacy" className="hover:text-brand">
              隱私權保護聲明
            </Link>
            <Link href="/legal/terms" className="hover:text-brand">
              使用授權合約
            </Link>
            <Link href="/legal/disclaimer" className="hover:text-brand">
              AI 內容免責聲明
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
