import { LeadsBoard } from "@/components/super-admin/LeadsBoard";

export default function SuperAdminLeadsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">問題與行銷名單</h1>
      <p className="mt-1 text-sm text-slate">
        機構洽詢、學生／家長候補名單，以及首頁聊天機器人留下的 email，都在這裡。
      </p>
      <div className="mt-8">
        <LeadsBoard />
      </div>
    </div>
  );
}
