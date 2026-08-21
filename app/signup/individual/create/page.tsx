import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { LegalConsentCheckbox } from "@/components/marketing/LegalConsentCheckbox";
import { signUpParentAndFirstChild } from "@/app/actions/parent-signup";

export const maxDuration = 30;

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: "請填寫所有欄位。",
  invalid_email: "請確認電子郵件格式是否正確（家長與子女的信箱都需要填寫）。",
  same_email: "家長與子女必須使用不同的電子郵件地址，因為兩者是各自獨立的登入帳號。",
  password_too_short: "密碼至少需要 8 個字元。",
  password_mismatch: "兩次輸入的密碼不一致。",
  invalid_tier: "請選擇一個方案。",
  must_agree_to_terms: "請先閱讀並勾選同意隱私權保護聲明、使用授權合約與 AI 內容免責聲明。",
  must_agree_to_trial_terms: "請先閱讀並勾選同意試用期相關條款。",
  parent_email_taken: "這個電子郵件地址已經有帳號了，請改用其他信箱，或直接前往登入。",
  child_email_taken: "子女的這個電子郵件地址已經有帳號了，請改用其他信箱。",
  stripe_not_configured: "付款系統尚未設定完成，請聯絡 info@nativeenglish.ca。",
  signup_failed: "建立帳號時發生問題，請稍後再試。",
  unexpected_error: "發生非預期的錯誤，請稍後再試一次。",
};

export default async function CreateIndividualAccountPage({
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
          學生 / 家長
        </div>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">
          註冊家長帳號
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate">
          家長帳號最多可以新增 3 位子女。建立帳號後會先加入第一位子女，之後可以在帳號內再新增最多 2
          位。子女會收到自己的邀請信，設定屬於自己的登入密碼。
        </p>

        {error && (
          <div className="mt-6 rounded border border-danger/30 bg-danger-tint text-danger text-sm px-4 py-3">
            {ERROR_MESSAGES[error] || "發生錯誤，請稍後再試。"}
          </div>
        )}

        <form action={signUpParentAndFirstChild} className="mt-8 flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="text-xs font-semibold text-ink uppercase tracking-wide">家長資訊</div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1">您的姓名</label>
              <input
                type="text"
                name="parent_name"
                required
                className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1">您的電子郵件</label>
              <input
                type="email"
                name="parent_email"
                required
                className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate mb-1">密碼</label>
                <input
                  type="password"
                  name="parent_password"
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
                  name="parent_confirm_password"
                  required
                  minLength={8}
                  className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-line pt-6">
            <div className="text-xs font-semibold text-ink uppercase tracking-wide">
              第一位子女的資訊
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1">
                子女的電子郵件（用於寄送邀請信，需與您的信箱不同）
              </label>
              <input
                type="email"
                name="child_email"
                required
                className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1">中文姓名</label>
              <input
                type="text"
                name="chinese_name"
                required
                className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate mb-1">
                  英文法定名字（First name）
                </label>
                <input
                  type="text"
                  name="legal_first_name"
                  required
                  className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate mb-1">
                  英文法定姓氏（Last name）
                </label>
                <input
                  type="text"
                  name="legal_last_name"
                  required
                  className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1">出生日期</label>
              <input
                type="date"
                name="birthdate"
                required
                className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
            <p className="text-xs text-slate">
              出生日期、中文姓名、英文法定名字與姓氏，送出後即會鎖定，之後只能透過「基本資料」頁面修改「這一次」，請確認內容正確。
            </p>
          </div>

          <div className="flex flex-col gap-3 border-t border-line pt-6">
            <div className="text-xs font-semibold text-ink uppercase tracking-wide">選擇方案</div>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input type="radio" name="seat_tier" value="basic" defaultChecked className="mt-1" />
              <span>
                <b>基本方案</b>
                <span className="block text-xs text-slate">適合大部分申請需求。</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input type="radio" name="seat_tier" value="advanced" className="mt-1" />
              <span>
                <b>進階方案</b>
                <span className="block text-xs text-slate">
                  包含更完整的 AI 輔助與檔案管理功能。
                </span>
              </span>
            </label>
          </div>

          <div className="flex flex-col gap-3 border-t border-line pt-6">
            <div className="text-xs font-semibold text-ink uppercase tracking-wide">付款方式</div>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="radio"
                name="trial_choice"
                value="start_trial"
                defaultChecked
                className="mt-1"
              />
              <span>
                <b>先試用 7 天</b>
                <span className="block text-xs text-slate">
                  現在提供信用卡資訊，但第 7 天才會實際扣款。
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input type="radio" name="trial_choice" value="pay_now" className="mt-1" />
              <span>
                <b>直接付款，不使用試用期</b>
                <span className="block text-xs text-slate">
                  立即扣款啟用，沒有試用期取消或資料刪除的疑慮。
                </span>
              </span>
            </label>

            <div className="rounded border border-warn/30 bg-warn-tint p-4 text-xs leading-relaxed text-ink">
              <b>請務必詳讀：</b>若選擇「先試用 7 天」，且在第 7 天扣款前取消訂閱，帳號與子女的所有資料將會
              <b>立即且永久刪除，無法復原</b>。試用期間，AI
              相關功能（腦力激盪、作文回饋、檔案評估）的使用次數也有上限，以避免濫用。若您希望避免這些限制，可以選擇「直接付款，不使用試用期」。
            </div>

            <label className="flex items-start gap-2 text-xs leading-relaxed text-slate">
              <input
                type="checkbox"
                name="agreed_to_trial_terms"
                value="yes"
                required
                className="mt-0.5 shrink-0"
              />
              <span>我已閱讀並理解上方試用期條款，包含取消後資料將無法復原一事。</span>
            </label>

            <LegalConsentCheckbox />
          </div>

          <button
            type="submit"
            className="rounded bg-ink px-4 py-2.5 text-sm font-semibold text-white self-start"
          >
            建立帳號並前往付款
          </button>
        </form>

        <p className="mt-6 text-xs text-slate">
          已經有帳號了？
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
