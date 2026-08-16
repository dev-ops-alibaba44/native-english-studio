import { createClient } from "@/lib/supabase/server";
import { LeadStatusSelect } from "./LeadStatusSelect";

export async function LeadsBoard() {
  const supabase = await createClient();

  const [{ data: agencyLeads }, { data: waitlistLeads }, { data: chatbotLeads }] =
    await Promise.all([
      supabase
        .from("agency_inquiries")
        .select("id, org_name, contact_name, contact_email, contact_phone, city, estimated_students, message, status, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("waitlist_signups")
        .select("id, role, name, email, city, notes, status, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("chatbot_messages")
        .select("id, email, created_at, session_id")
        .eq("role", "lead")
        .order("created_at", { ascending: false }),
    ]);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-display text-base font-bold text-ink">
          機構洽詢（{agencyLeads?.length ?? 0}）
        </h2>
        <div className="mt-3 space-y-3">
          {(agencyLeads ?? []).map((lead) => (
            <div key={lead.id} className="rounded border border-line bg-surface p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-ink">{lead.org_name}</div>
                  <div className="text-xs text-slate">
                    {lead.contact_name} ·{" "}
                    <a href={`mailto:${lead.contact_email}`} className="text-brand hover:underline">
                      {lead.contact_email}
                    </a>
                    {lead.contact_phone ? ` · ${lead.contact_phone}` : ""}
                    {lead.city ? ` · ${lead.city}` : ""}
                  </div>
                </div>
                <LeadStatusSelect table="agency_inquiries" id={lead.id} initialStatus={lead.status} />
              </div>
              {lead.estimated_students && (
                <p className="mt-1.5 text-xs text-slate">預估人數：{lead.estimated_students}</p>
              )}
              {lead.message && <p className="mt-1.5 text-sm text-ink">{lead.message}</p>}
              <p className="mt-2 text-xs text-slate">
                {new Date(lead.created_at).toLocaleString("zh-TW")}
              </p>
            </div>
          ))}
          {(agencyLeads ?? []).length === 0 && (
            <p className="text-sm text-slate">目前沒有機構洽詢。</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-display text-base font-bold text-ink">
          學生／家長候補名單（{waitlistLeads?.length ?? 0}）
        </h2>
        <div className="mt-3 space-y-3">
          {(waitlistLeads ?? []).map((lead) => (
            <div key={lead.id} className="rounded border border-line bg-surface p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-ink">
                    {lead.name || "（未填寫姓名）"}{" "}
                    <span className="text-xs text-slate">
                      ({lead.role === "student" ? "學生" : "家長"})
                    </span>
                  </div>
                  <div className="text-xs text-slate">
                    <a href={`mailto:${lead.email}`} className="text-brand hover:underline">
                      {lead.email}
                    </a>
                    {lead.city ? ` · ${lead.city}` : ""}
                  </div>
                </div>
                <LeadStatusSelect table="waitlist_signups" id={lead.id} initialStatus={lead.status} />
              </div>
              {lead.notes && <p className="mt-1.5 text-sm text-ink">{lead.notes}</p>}
              <p className="mt-2 text-xs text-slate">
                {new Date(lead.created_at).toLocaleString("zh-TW")}
              </p>
            </div>
          ))}
          {(waitlistLeads ?? []).length === 0 && (
            <p className="text-sm text-slate">目前沒有候補名單。</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-display text-base font-bold text-ink">
          AI 聊天機器人留下的名單（{chatbotLeads?.length ?? 0}）
        </h2>
        <p className="mt-1 text-xs text-slate">
          完整對話紀錄可在 Supabase Dashboard 的 chatbot_messages 資料表中，依 session_id 查看。
        </p>
        <div className="mt-3 space-y-2">
          {(chatbotLeads ?? []).map((lead) => (
            <div
              key={lead.id}
              className="flex items-center justify-between rounded border border-line bg-surface px-4 py-2.5 text-sm"
            >
              <a href={`mailto:${lead.email}`} className="text-brand hover:underline">
                {lead.email}
              </a>
              <span className="text-xs text-slate">
                {new Date(lead.created_at).toLocaleString("zh-TW")}
              </span>
            </div>
          ))}
          {(chatbotLeads ?? []).length === 0 && (
            <p className="text-sm text-slate">目前沒有聊天機器人留下的 email。</p>
          )}
        </div>
      </section>
    </div>
  );
}
