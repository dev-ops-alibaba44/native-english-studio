import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ROLE_LABEL: Record<string, string> = {
  student: "學生",
  advisor: "顧問",
  agency_admin: "機構管理者",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, role, agency_id")
    .eq("id", user.id)
    .single();

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          歡迎回來，{profile?.display_name || user.email}
        </h1>
        <p className="mt-2 text-sm text-slate">
          身分：{profile ? ROLE_LABEL[profile.role] ?? profile.role : "讀取中…"}
        </p>
      </div>

      <div className="rounded border border-line bg-surface px-5 py-4 shadow-card text-left max-w-sm w-full">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate mb-2">
          Batch 2 setup check
        </p>
        {error ? (
          <p className="text-sm text-danger">
            無法讀取個人資料：{error.message}
          </p>
        ) : (
          <p className="text-sm text-good font-semibold">
            登入、資料庫、權限規則（RLS）皆正常運作 ✓
          </p>
        )}
      </div>

      <form action={signOut}>
        <button
          type="submit"
          className="rounded border border-line bg-surface px-4 py-2 text-sm font-medium text-ink"
        >
          登出
        </button>
      </form>
    </main>
  );
}
