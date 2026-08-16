import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateStudentIdentity } from "@/app/actions/student-identity";

const ERROR_MESSAGES: Record<string, string> = {
  student_not_found: "找不到這位學生。",
  fields_locked: "以下欄位已經修改過一次，無法再次修改：",
};

const FIELD_LABELS: Record<string, string> = {
  birthdate: "出生日期",
  chinese_name: "中文姓名",
  legal_first_name: "英文法定名字",
  legal_last_name: "英文法定姓氏",
  preferred_name: "英文慣用名 / 暱稱（每 30 天限改一次）",
};

export default async function StudentIdentityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; fields?: string; success?: string }>;
}) {
  const { id: studentId } = await params;
  const { error, fields, success } = await searchParams;
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("profiles")
    .select(
      "id, display_name, birthdate, birthdate_locked, chinese_name, chinese_name_locked, legal_first_name, legal_first_name_locked, legal_last_name, legal_last_name_locked, preferred_name, preferred_name_changed_at"
    )
    .eq("id", studentId)
    .maybeSingle();

  if (!student) {
    return <p className="text-sm text-danger">找不到這位學生。</p>;
  }

  const rejectedFields = fields ? fields.split(",") : [];
  const preferredNameDaysLeft = student.preferred_name_changed_at
    ? Math.max(
        0,
        30 - Math.floor((Date.now() - new Date(student.preferred_name_changed_at).getTime()) / (24 * 60 * 60 * 1000))
      )
    : 0;

  return (
    <div className="max-w-lg">
      <Link href="/agency/students" className="text-xs text-slate mb-3 inline-block">
        ← 回到學生總覽
      </Link>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">
        {student.display_name} · 基本資料
      </h1>

      {success && (
        <div className="rounded border border-good/30 bg-good-tint text-good text-sm px-4 py-3 my-4">
          已儲存。
        </div>
      )}
      {error && (
        <div className="rounded border border-danger/30 bg-danger-tint text-danger text-sm px-4 py-3 my-4">
          {ERROR_MESSAGES[error] || "發生錯誤，請稍後再試。"}
          {error === "fields_locked" && rejectedFields.length > 0 && (
            <ul className="list-disc list-inside mt-1">
              {rejectedFields.map((f) => (
                <li key={f}>{FIELD_LABELS[f] || f}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="rounded border border-warn/30 bg-warn-tint p-4 my-4 text-sm text-ink">
        <b>請務必小心：</b>
        出生日期、中文姓名、英文法定名字、英文法定姓氏，這四個欄位<b>一旦送出就會鎖定，只能修改「這一次」</b>
        （如果目前還是空白，代表還沒使用過這次機會）。送出前請再三確認拼字與內容是否正確——之後如果發現輸入錯誤，將無法再次修改。英文慣用名／暱稱沒有鎖定限制，但每 30 天只能修改一次。
      </div>

      <form action={updateStudentIdentity.bind(null, studentId)} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-slate mb-1">
            出生日期
            {student.birthdate_locked && <span className="text-danger"> · 已鎖定，無法再次修改</span>}
          </label>
          <input
            type="date"
            name="birthdate"
            defaultValue={student.birthdate || ""}
            disabled={student.birthdate_locked}
            className="w-full rounded border border-line px-3 py-2 text-sm disabled:bg-slate-light/40 disabled:text-slate"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate mb-1">
            中文姓名
            {student.chinese_name_locked && <span className="text-danger"> · 已鎖定，無法再次修改</span>}
          </label>
          <input
            type="text"
            name="chinese_name"
            defaultValue={student.chinese_name || ""}
            disabled={student.chinese_name_locked}
            className="w-full rounded border border-line px-3 py-2 text-sm disabled:bg-slate-light/40 disabled:text-slate"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate mb-1">
              英文法定名字（First name）
              {student.legal_first_name_locked && (
                <span className="text-danger"> · 已鎖定</span>
              )}
            </label>
            <input
              type="text"
              name="legal_first_name"
              defaultValue={student.legal_first_name || ""}
              disabled={student.legal_first_name_locked}
              className="w-full rounded border border-line px-3 py-2 text-sm disabled:bg-slate-light/40 disabled:text-slate"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate mb-1">
              英文法定姓氏（Last name）
              {student.legal_last_name_locked && <span className="text-danger"> · 已鎖定</span>}
            </label>
            <input
              type="text"
              name="legal_last_name"
              defaultValue={student.legal_last_name || ""}
              disabled={student.legal_last_name_locked}
              className="w-full rounded border border-line px-3 py-2 text-sm disabled:bg-slate-light/40 disabled:text-slate"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate mb-1">
            英文慣用名 / 暱稱
            {preferredNameDaysLeft > 0 && (
              <span className="text-danger"> · 還需等 {preferredNameDaysLeft} 天才能再次修改</span>
            )}
          </label>
          <input
            type="text"
            name="preferred_name"
            defaultValue={student.preferred_name || ""}
            disabled={preferredNameDaysLeft > 0}
            className="w-full rounded border border-line px-3 py-2 text-sm disabled:bg-slate-light/40 disabled:text-slate"
          />
        </div>

        <button
          type="submit"
          className="rounded bg-ink px-4 py-2 text-sm font-semibold text-white self-start"
        >
          我已確認無誤，儲存
        </button>
      </form>
    </div>
  );
}
