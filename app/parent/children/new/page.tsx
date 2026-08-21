import Link from "next/link";
import { addChildAccount } from "@/app/actions/parent-children";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

export const maxDuration = 30;

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: "請完整填寫所有必填欄位。",
  invalid_email: "請輸入正確格式的電子郵件地址。",
  invalid_tier: "請選擇一個方案。",
  account_inactive: "此帳號的訂閱目前未生效，請先至「帳單與訂閱」完成付款設定。",
  max_children_reached: "已達最多 3 位子女的上限。",
  child_email_taken: "這個電子郵件地址已經有帳號了，請改用其他信箱。",
  invite_failed: "無法寄送邀請信，請稍後再試。",
  profile_save_failed: "帳號已建立，但子女資料儲存失敗，請聯絡系統管理者。",
  stripe_not_configured: "付款系統尚未設定完成，請聯絡 info@nativeenglish.ca。",
  unexpected_error: "發生非預期的錯誤，請稍後再試一次。",
};

export default async function NewChildPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="max-w-lg">
      <Link href="/parent" className="text-xs text-slate mb-3 inline-block">
        ← 回到子女總覽
      </Link>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">新增子女</h1>
      <p className="text-sm text-slate mb-6">
        會立即在您目前的訂閱中新增一項費用（依比例計費），並寄送邀請信給子女，讓他們自行設定密碼並登入。
      </p>

      {error && (
        <div className="rounded border border-danger/30 bg-danger-tint text-danger text-sm px-4 py-3 mb-6">
          {ERROR_MESSAGES[error] || "發生錯誤，請稍後再試。"}
        </div>
      )}

      <div className="rounded border border-warn/30 bg-warn-tint p-4 mb-4 text-sm text-ink">
        <b>請務必小心：</b>
        出生日期、中文姓名、英文法定名字、英文法定姓氏，這四個欄位<b>送出後就會鎖定</b>
        ，之後只能透過該子女的「基本資料」頁面修改「這一次」。送出前請再三確認拼字與內容是否正確。
      </div>

      <form action={addChildAccount} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-slate mb-1">
            子女的電子郵件（用於寄送邀請信）
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

        <div className="flex flex-col gap-2">
          <label className="block text-xs font-medium text-slate">方案</label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="radio" name="seat_tier" value="basic" defaultChecked />
            基本方案
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="radio" name="seat_tier" value="advanced" />
            進階方案
          </label>
        </div>

        <ConfirmSubmitButton
          confirmMessage="確定要新增這位子女嗎？這會立即在您的訂閱中新增一項費用（依比例計費）。出生日期、中文姓名、英文法定名字與姓氏送出後即會鎖定，請確認已再三檢查內容是否正確。"
          className="rounded bg-ink px-4 py-2 text-sm font-semibold text-white self-start"
        >
          新增子女並寄送邀請信
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
