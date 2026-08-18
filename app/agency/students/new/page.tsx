import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createStudentAccount } from "@/app/actions/student-signup";
import { admissionCycleOptions, numberSeatsByType } from "@/lib/seats";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

// Batch 25: raises the Vercel serverless function timeout for this
// route above the platform default (10s on Hobby / 15s on Pro) — the
// createStudentAccount action does a real SMTP send (via Custom SMTP,
// since Batch 24) on top of several sequential DB calls, and Dan saw an
// intermittent server-error page after submitting that's consistent
// with the request occasionally running past the default limit.
export const maxDuration = 30;

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: "請完整填寫所有必填欄位（含選擇席次）。",
  invalid_email: "請輸入正確格式的電子郵件地址。",
  seat_unavailable: "所選席次已被使用或不存在，請重新選擇。",
  email_taken: "這個電子郵件地址已經有帳號了，請確認是否已建立過，或改用其他信箱。",
  invite_failed: "無法寄送邀請信，請稍後再試。",
  profile_save_failed: "帳號已建立，但學生資料儲存失敗，請聯絡系統管理者手動補上。",
  unexpected_error: "發生非預期的錯誤，請稍後再試一次。如持續發生，請聯絡系統管理者。",
};

export default async function NewStudentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user!.id)
    .single();

  if (!profile?.agency_id) {
    return <p className="text-sm text-danger">此帳號尚未加入任何機構。</p>;
  }

  // Only unused, unassigned seats can be picked here — the exact same
  // pool the old inline "指派席次" dropdown on the students list drew
  // from, just now offered at creation time instead of only afterward.
  const { data: seatsRaw } = await supabase
    .from("seats")
    .select("id, seat_type, admission_cycle_end_year, purchased_at")
    .eq("agency_id", profile.agency_id)
    .eq("status", "unused")
    .is("assigned_student_id", null)
    .order("purchased_at", { ascending: true });

  const availableSeats = seatsRaw || [];
  const seatNumberById = numberSeatsByType(availableSeats);
  const cycleLabelByYear = new Map(admissionCycleOptions().map((o) => [o.value, o.label]));

  return (
    <div className="max-w-lg">
      <Link href="/agency/students" className="text-xs text-slate mb-3 inline-block">
        ← 回到學生總覽
      </Link>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">新增學生</h1>
      <p className="text-sm text-slate mb-6">
        建立學生帳號，系統會寄送邀請信給學生本人，讓他們自行設定密碼並登入。
      </p>

      {error && (
        <div className="rounded border border-danger/30 bg-danger-tint text-danger text-sm px-4 py-3 mb-6">
          {ERROR_MESSAGES[error] || "發生錯誤，請稍後再試。"}
        </div>
      )}

      {availableSeats.length === 0 ? (
        <div className="rounded border border-warn/30 bg-warn-tint p-4 text-sm text-ink">
          <b>目前沒有可用的席次。</b> 請先前往
          <Link href="/agency/billing" className="text-brand underline mx-1">
            帳單與繳費
          </Link>
          新增席次，才能建立新的學生帳號。
        </div>
      ) : (
        <>
          <div className="rounded border border-warn/30 bg-warn-tint p-4 mb-4 text-sm text-ink">
            <b>請務必小心：</b>
            出生日期、中文姓名、英文法定名字、英文法定姓氏，這四個欄位<b>送出後就會鎖定</b>
            ，之後只能透過該學生的「基本資料」頁面修改「這一次」。送出前請再三確認拼字與內容是否正確。
          </div>

          <form action={createStudentAccount} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-slate mb-1">
                學生電子郵件（用於寄送邀請信）
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="student@example.com"
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
              <label className="block text-xs font-medium text-slate mb-1">
                英文慣用名 / 暱稱（選填）
              </label>
              <input
                type="text"
                name="preferred_name"
                className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
              />
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

            <div>
              <label className="block text-xs font-medium text-slate mb-1">指派席次</label>
              <select
                name="seat_id"
                required
                defaultValue=""
                className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand"
              >
                <option value="" disabled>
                  選擇一個尚未使用的席次
                </option>
                {availableSeats.map((seat) => (
                  <option key={seat.id} value={seat.id}>
                    {seat.seat_type === "premium" ? "進階席次" : "標準席次"} #{seatNumberById.get(seat.id)}
                    {seat.admission_cycle_end_year
                      ? ` · ${cycleLabelByYear.get(seat.admission_cycle_end_year) || seat.admission_cycle_end_year}`
                      : " · 尚未設定入學年度"}
                  </option>
                ))}
              </select>
            </div>

            <ConfirmSubmitButton
              confirmMessage="確定要送出嗎？出生日期、中文姓名、英文法定名字與姓氏，送出後即會鎖定，之後只能透過學生的「基本資料」頁面修改「這一次」。請確認已再三檢查拼字與內容是否正確。"
              className="rounded bg-ink px-4 py-2 text-sm font-semibold text-white self-start"
            >
              建立學生帳號並寄送邀請信
            </ConfirmSubmitButton>
          </form>
        </>
      )}
    </div>
  );
}
