import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { LegalConsentCheckbox } from "@/components/marketing/LegalConsentCheckbox";
import { signUpAgency } from "@/app/actions/agency-signup";

export const maxDuration = 30;

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: "請填寫所有欄位。",
  invalid_email: "請輸入正確格式的電子郵件地址。",
  password_too_short: "密碼至少需要 8 個字元。",
  password_mismatch: "兩次輸入的密碼不一致。",
  email_taken: "這個電子郵件地址已經有帳號了，請改用其他信箱，或直接前往登入。",
  signup_failed: "建立帳號時發生問題，請稍後再試。",
  must_agree_to_terms: "請先閱讀並勾選同意隱私權保護聲明、使用授權合約與 AI 內容免責聲明。",
  stripe_not_configured: "付款系統尚未設定完成，請聯絡 info@nativeenglish.ca。",
  unexpected_error: "發生非預期的錯誤，請稍後再試一次。",
};

export default async function CreateAgencyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-lg px-6 py-16 sm:py-20">
        <div className="text-xs font-semibold uppercase tracking-wide text-brand">
          機構 / 顧問中心
        </div>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">
          註冊機構帳號
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate">
          建立帳號後，會立即進入付款頁面完成年度授權費（$2,000）的付款設定——與其他機構相同，享有 7
          天鑑賞期，鑑賞期內可隨時取消。付款完成後，帳號會自動啟用，即可開始新增顧問與學生。
        </p>

        {error && (
          <div className="mt-6 rounded border border-danger/30 bg-danger-tint text-danger text-sm px-4 py-3">
            {ERROR_MESSAGES[error] || "發生錯誤，請稍後再試。"}
          </div>
        )}

        <form action={signUpAgency} className="mt-8 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-slate mb-1">機構名稱</label>
            <input
              type="text"
              name="agency_name"
              required
              className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate mb-1">您的姓名</label>
            <input
              type="text"
              name="admin_name"
              required
              className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate mb-1">電子郵件</label>
            <input
              type="email"
              name="email"
              required
              className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate mb-1">密碼</label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              placeholder="至少 8 個字元"
              className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate mb-1">再次輸入密碼</label>
            <input
              type="password"
              name="confirm_password"
              required
              minLength={8}
              className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>

          <LegalConsentCheckbox />

          <button
            type="submit"
            className="rounded bg-ink px-4 py-2.5 text-sm font-semibold text-white self-start"
          >
            建立帳號並前往付款
          </button>
        </form>

        <p className="mt-6 text-xs text-slate">
          想先與我們聊聊再決定？
          <Link href="/signup/agency" className="text-brand underline ml-1">
            改為留下聯絡方式
          </Link>
          。已經有帳號了？
          <Link href="/login" className="text-brand underline ml-1">
            登入
          </Link>
          。
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
