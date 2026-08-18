import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StageThread } from "@/components/StageThread";
import { type Stage } from "@/lib/stages";
import { createApplicationFor } from "@/app/actions/applications";
import { sortApplicationsByDeadline, sortStudentsByDeadline } from "@/lib/deadlines";
import { assignSeat, cancelSeat, setAdmissionCycle } from "@/app/actions/seats";
import {
  SEAT_ERROR_MESSAGES,
  admissionCycleOptions,
  daysLeftToCancel,
  effectiveExpiresAt,
  numberSeatsByType,
} from "@/lib/seats";

const ERROR_MESSAGES: Record<string, string> = {
  ...SEAT_ERROR_MESSAGES,
  missing_school_name: "請輸入學校名稱。",
  no_agency: "這位學生尚未加入任何機構。",
  school_failed: "無法建立學校資料，請稍後再試。",
  duplicate_school: "這位學生已經新增過這間學校的申請了。",
  application_failed: "無法建立申請項目，請稍後再試。",
  missing_fields: "請選擇席次與學生。",
  seat_unavailable: "此席次已被使用或不存在。",
  student_not_found: "找不到這位學生。",
  seat_not_found: "找不到這個席次。",
  seat_not_cancelable: "此席次已被使用，無法取消——僅未使用的席次可在購買 7 天內取消。",
  seat_cancel_window_passed: "已超過購買後 7 天，此席次無法取消。",
  already_premium: "此席次已經是進階席次。",
  seat_not_upgradable: "此席次狀態無法升級。",
  invalid_admission_cycle: "請選擇有效的入學年度。",
  stripe_not_configured: "付款系統尚未設定完成，請聯絡系統管理者設定 Stripe 價格 ID。",
};

const SUCCESS_MESSAGES: Record<string, string> = {
  "1": "新增成功！",
  student_created: "學生帳號已建立，邀請信已寄出。",
  archived: "學生已封存。",
};

export default async function AgencyStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    advisor?: string;
    error?: string;
    success?: string;
    warning?: string;
    seat_action?: string;
    sort?: string;
  }>;
}) {
  const { advisor: advisorFilter, error, success, warning, seat_action, sort } = await searchParams;
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

  let studentsQuery = supabase
    .from("profiles")
    .select(
      "id, display_name, primary_advisor_id, is_archived, pending_seat_deadline, applications(id, stage, deadline, schools(name))"
    )
    .eq("agency_id", profile.agency_id)
    .eq("role", "student")
    .order("display_name");

  if (advisorFilter) {
    studentsQuery = studentsQuery.eq("primary_advisor_id", advisorFilter);
  }

  const { data: studentsRaw } = await studentsQuery;
  const sortByDeadline = sort === "deadline";
  const students = sortByDeadline ? sortStudentsByDeadline(studentsRaw || []) : studentsRaw || [];

  // Batch 18: seat status per student. Batch 23: this is now also where
  // every per-seat lifecycle action (cancel / upgrade / set admission
  // cycle) lives, having moved off the billing page along with the
  // removed 席次清單 — so unassigned seats need to be shown here too,
  // not just filtered into the assign-seat dropdown.
  const { data: seatsRaw } = await supabase
    .from("seats")
    .select(
      "id, seat_type, status, assigned_student_id, purchased_at, expires_at, admission_cycle_end_year"
    )
    .eq("agency_id", profile.agency_id)
    .order("purchased_at", { ascending: false });

  const allSeats = seatsRaw || [];
  const seatByStudentId = new Map(
    allSeats.filter((s) => s.assigned_student_id).map((s) => [s.assigned_student_id, s])
  );
  const unassignedSeats = allSeats.filter((s) => !s.assigned_student_id && s.status === "unused");
  const unassignedSeatNumberById = numberSeatsByType(unassignedSeats);
  const cycleLabelByYear = new Map(admissionCycleOptions().map((o) => [o.value, o.label]));

  // Preserve the advisor filter (if any) when switching sort mode.
  const sortLinkSuffix = advisorFilter ? `&advisor=${advisorFilter}` : "";

  const { data: advisorsList } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("agency_id", profile.agency_id)
    .eq("role", "advisor");

  const advisorNameById = new Map((advisorsList || []).map((a) => [a.id, a.display_name]));
  const filteredAdvisorName = advisorFilter ? advisorNameById.get(advisorFilter) : null;

  return (
    <div>
      <Link href="/agency" className="text-xs text-slate mb-3 inline-block">
        ← 回到機構總覽
      </Link>
      <div className="flex items-start justify-between gap-4 mb-1">
        <h1 className="font-display text-2xl font-bold text-ink">學生總覽</h1>
        <Link
          href="/agency/students/new"
          className="shrink-0 rounded bg-ink px-3 py-1.5 text-xs font-semibold text-white"
        >
          + 新增學生
        </Link>
      </div>
      {filteredAdvisorName ? (
        <p className="text-sm text-slate mb-6">
          僅顯示 <b className="text-ink">{filteredAdvisorName}</b> 的學生 ·{" "}
          <Link href="/agency/students" className="text-brand underline">
            查看全部學生
          </Link>
        </p>
      ) : (
        <p className="text-sm text-slate mb-6">機構所有學生，點選任一申請項目可查看詳細進度。</p>
      )}

      {error && (
        <div className="rounded border border-danger/30 bg-danger-tint text-danger text-sm px-4 py-3 mb-6">
          {ERROR_MESSAGES[error] || "發生錯誤，請稍後再試。"}
        </div>
      )}
      {success && (
        <div className="rounded border border-good/30 bg-good-tint text-good text-sm px-4 py-3 mb-6">
          {SUCCESS_MESSAGES[success] || "操作成功！"}
        </div>
      )}
      {seat_action === "canceled" && (
        <div className="rounded border border-good/30 bg-good-tint text-good text-sm px-4 py-3 mb-6">
          席次已取消，款項將依比例退還。
        </div>
      )}
      {seat_action === "upgraded" && (
        <div className="rounded border border-good/30 bg-good-tint text-good text-sm px-4 py-3 mb-6">
          席次已升級為進階席次。
        </div>
      )}
      {seat_action === "cycle_set" && (
        <div className="rounded border border-good/30 bg-good-tint text-good text-sm px-4 py-3 mb-6">
          入學年度已設定，到期日已更新。
        </div>
      )}
      {warning === "seat_assignment_failed" && (
        <div className="rounded border border-danger/30 bg-danger-tint text-danger text-sm px-4 py-3 mb-6">
          <b>學生帳號已建立，但席次指派失敗</b>
          （可能是同時有另一位使用者選走了同一個席次）。請在下方為這位學生重新指派一個席次——如果 7
          天內仍未指派，這個帳號將會被自動刪除。
        </div>
      )}

      {unassignedSeats.length > 0 && (
        <div className="mb-6">
          <h3 className="font-display font-bold text-base mb-2">
            尚未分配的席次（{unassignedSeats.length}）
          </h3>
          <div className="rounded border border-line bg-surface shadow-card divide-y divide-line">
            {unassignedSeats.map((seat) => {
              const cancelDaysLeft = daysLeftToCancel(seat.purchased_at);
              const canCancel = cancelDaysLeft > 0;
              const canUpgrade = seat.seat_type === "standard";
              return (
                <div key={seat.id} className="p-4 flex items-center justify-between text-sm gap-3">
                  <div>
                    <div className="font-semibold">
                      {seat.seat_type === "premium" ? "進階席次" : "標準席次"} #{unassignedSeatNumberById.get(seat.id)}
                      <span className="text-slate font-normal"> · 尚未指派學生</span>
                    </div>
                    <div className="text-xs text-slate">
                      購買於 {new Date(seat.purchased_at).toLocaleDateString("zh-TW")} · 到期於{" "}
                      {effectiveExpiresAt(seat).toLocaleDateString("zh-TW")}
                      {seat.admission_cycle_end_year && (
                        <> · 入學年度 {seat.admission_cycle_end_year - 1}–{seat.admission_cycle_end_year}</>
                      )}
                    </div>
                    {!seat.admission_cycle_end_year && (
                      <form
                        action={setAdmissionCycle.bind(null, seat.id)}
                        className="flex items-center gap-1 mt-1"
                      >
                        <span className="text-xs text-warn">尚未設定入學年度：</span>
                        <select
                          name="admission_cycle_end_year"
                          className="rounded border border-line px-1.5 py-0.5 text-xs"
                          defaultValue={admissionCycleOptions()[1]?.value}
                        >
                          {admissionCycleOptions().map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="text-xs text-brand underline">
                          設定
                        </button>
                      </form>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {canUpgrade && (
                      <a
                        href={`/agency/billing/seats/${seat.id}/upgrade`}
                        className="text-xs text-brand underline"
                      >
                        升級為進階
                      </a>
                    )}
                    {canCancel && (
                      <form action={cancelSeat.bind(null, seat.id)}>
                        <button type="submit" className="text-xs text-danger underline">
                          取消（剩 {cancelDaysLeft} 天可取消）
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <h3 className="font-display font-bold text-base mb-2">已註冊學生（{students.length}）</h3>
      <div className="flex items-center gap-2 mb-6">
        <Link
          href={`/agency/students?sort=name${sortLinkSuffix}`}
          className={`rounded px-3 py-1.5 text-xs font-semibold ${
            !sortByDeadline ? "bg-ink text-white" : "border border-line text-slate"
          }`}
        >
          依姓名排序
        </Link>
        <Link
          href={`/agency/students?sort=deadline${sortLinkSuffix}`}
          className={`rounded px-3 py-1.5 text-xs font-semibold ${
            sortByDeadline ? "bg-ink text-white" : "border border-line text-slate"
          }`}
        >
          依最近截止日排序
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        {!students || students.length === 0 ? (
          <p className="text-sm text-slate">目前還沒有學生。</p>
        ) : (
          students.map((student: any) => {
            const addApplicationForThisStudent = createApplicationFor.bind(
              null,
              student.id,
              "/agency/students"
            );
            const seat = seatByStudentId.get(student.id);
            const cancelDaysLeft = seat ? daysLeftToCancel(seat.purchased_at) : 0;
            const canCancel = seat?.status === "unused" && cancelDaysLeft > 0;
            const canUpgrade =
              seat?.seat_type === "standard" &&
              (seat?.status === "unused" || seat?.status === "active");
            return (
            <div key={student.id} className="rounded border border-line bg-surface shadow-card p-5">
              {!seat && student.pending_seat_deadline && (
                <div className="rounded border border-danger/30 bg-danger-tint text-danger text-xs px-3 py-2 mb-3">
                  ⚠️ 尚未成功指派席次，此帳號將於{" "}
                  <b>{new Date(student.pending_seat_deadline).toLocaleDateString("zh-TW")}</b>{" "}
                  自動刪除。請盡快於右方指派一個席次。
                </div>
              )}
              <div className="flex items-center justify-between mb-3">
                <div className="font-display font-bold text-base">{student.display_name}</div>
                <div className="flex items-center gap-3 flex-wrap justify-end">
                  <a
                    href={`/agency/students/${student.id}/identity`}
                    className="text-xs text-brand underline"
                  >
                    基本資料
                  </a>
                  <div className="text-xs text-slate">
                    所屬顧問：{advisorNameById.get(student.primary_advisor_id) || "尚未指派"}
                  </div>
                  {!seat && unassignedSeats.length > 0 && (
                    <form action={assignSeat} className="flex items-center gap-1">
                      <input type="hidden" name="student_id" value={student.id} />
                      <select
                        name="seat_id"
                        className="rounded border border-line px-2 py-1 text-xs"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          指派席次
                        </option>
                        {unassignedSeats.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.seat_type === "premium" ? "進階席次" : "標準席次"} #{unassignedSeatNumberById.get(s.id)}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="text-xs text-brand underline">
                        指派
                      </button>
                    </form>
                  )}
                  {!seat && unassignedSeats.length === 0 && (
                    <span className="text-xs text-danger">尚未分配席次</span>
                  )}
                  {seat && (
                    <>
                      <span className="text-xs text-slate">
                        {seat.seat_type === "premium" ? "進階席次" : "標準席次"} ·{" "}
                        {seat.status === "expired"
                          ? "已到期（唯讀）"
                          : seat.status === "archived"
                            ? "已封存（唯讀）"
                            : seat.status === "canceled"
                              ? "已取消"
                              : "使用中"}
                      </span>
                      {canUpgrade && (
                        <a
                          href={`/agency/billing/seats/${seat.id}/upgrade`}
                          className="text-xs text-brand underline"
                        >
                          升級為進階
                        </a>
                      )}
                      {canCancel && (
                        <form action={cancelSeat.bind(null, seat.id)}>
                          <button type="submit" className="text-xs text-danger underline">
                            取消（剩 {cancelDaysLeft} 天可取消）
                          </button>
                        </form>
                      )}
                    </>
                  )}
                  {!student.is_archived && (
                    <a
                      href={`/agency/students/${student.id}/archive`}
                      className="text-xs text-slate underline"
                    >
                      封存學生
                    </a>
                  )}
                  {student.is_archived && (
                    <span className="text-xs font-semibold text-slate">已封存</span>
                  )}
                </div>
              </div>
              {(!student.applications || student.applications.length === 0) && (
                <p className="text-sm text-slate">尚未新增任何申請項目。</p>
              )}
              <div className="flex flex-col gap-3 mb-3">
                {sortApplicationsByDeadline(student.applications || []).map((app: any) => (
                  <Link
                    key={app.id}
                    href={`/agency/applications/${app.id}`}
                    className="flex items-center gap-4 rounded border border-line p-3 hover:border-brand"
                  >
                    <div className="w-28 shrink-0 text-sm font-semibold">{app.schools?.name}</div>
                    <div className="flex-1">
                      <StageThread stage={app.stage as Stage} size="sm" />
                    </div>
                    <div className="w-24 shrink-0 text-right text-xs text-slate">
                      {app.deadline || "無截止日"}
                    </div>
                  </Link>
                ))}
              </div>
              <details>
                <summary className="cursor-pointer text-xs text-brand underline select-none">
                  + 新增學校
                </summary>
                <form
                  action={addApplicationForThisStudent}
                  className="mt-2 flex flex-wrap items-end gap-2"
                >
                  <input
                    name="school_name"
                    required
                    placeholder="學校名稱"
                    className="rounded border border-line px-3 py-1.5 text-sm outline-none focus:border-brand"
                  />
                  <input
                    name="deadline"
                    type="date"
                    className="rounded border border-line px-3 py-1.5 text-sm outline-none focus:border-brand"
                  />
                  <input
                    name="word_limit"
                    type="number"
                    placeholder="字數上限"
                    className="w-28 rounded border border-line px-3 py-1.5 text-sm outline-none focus:border-brand"
                  />
                  <button
                    type="submit"
                    className="rounded bg-ink px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    新增
                  </button>
                </form>
              </details>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}
