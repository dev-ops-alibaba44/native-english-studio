import Link from "next/link";
import { createAdvisorAccount } from "@/app/actions/advisor-signup";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { DEFAULT_ADVISOR_CAPACITY } from "@/lib/capacity";

// Batch 25: raises the Vercel serverless function timeout for this
// route — same reasoning as app/agency/students/new/page.tsx, since
// createAdvisorAccount also does a real SMTP send via Custom SMTP.
export const maxDuration = 30;

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: "請填寫電子郵件與姓名。",
  invalid_email: "請輸入正確格式的電子郵件地址。",
  invalid_capacity: "承接上限必須是大於 0 的數字，或留空使用預設值。",
  email_taken: "這個電子郵件地址已經有帳號了，請確認是否已建立過，或改用其他信箱。",
  invite_failed: "無法寄送邀請信，請稍後再試。",
  profile_save_failed: "帳號已建立，但顧問資料儲存失敗，請聯絡系統管理者手動補上。",
  unexpected_error: "發生非預期的錯誤，請稍後再試一次。如持續發生，請聯絡系統管理者。",
};

export default async function NewAdvisorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="max-w-lg">
      <Link href="/agency/capacity" className="text-xs text-slate mb-3 inline-block">
        ← 回到顧問產能
      </Link>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">新增顧問</h1>
      <p className="text-sm text-slate mb-6">
        建立顧問帳號，系統會寄送邀請信給對方，讓他們自行設定密碼並登入。
      </p>

      {error && (
        <div className="rounded border border-danger/30 bg-danger-tint text-danger text-sm px-4 py-3 mb-6">
          {ERROR_MESSAGES[error] || "發生錯誤，請稍後再試。"}
        </div>
      )}

      <form action={createAdvisorAccount} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-slate mb-1">
            顧問電子郵件（用於寄送邀請信）
          </label>
          <input
            type="email"
            name="email"
            required
            placeholder="advisor@example.com"
            className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate mb-1">姓名</label>
          <input
            type="text"
            name="display_name"
            required
            className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate mb-1">
            承接上限（選填，留空則預設為 {DEFAULT_ADVISOR_CAPACITY} 位學生，之後可於「顧問產能」頁面隨時調整）
          </label>
          <input
            type="number"
            name="capacity"
            min={1}
            placeholder={String(DEFAULT_ADVISOR_CAPACITY)}
            className="w-32 rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        <ConfirmSubmitButton
          confirmMessage="確定要建立這位顧問的帳號並寄送邀請信嗎？"
          className="rounded bg-ink px-4 py-2 text-sm font-semibold text-white self-start"
        >
          建立顧問帳號並寄送邀請信
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
