import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .single();

  // Lighter version of the super-admin gate — either role can be here,
  // since super_admin can see everything marketing can, but not the
  // reverse. RLS (batch13_super_admin.sql) enforces the actual data
  // access either way; this is just routing.
  if (profile?.role !== "super_admin" && profile?.role !== "marketing") {
    redirect("/dashboard");
  }

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-3 bg-surface border-b border-line">
        <Image
          src="/logo-white.png"
          alt="Native English"
          width={1288}
          height={280}
          className="h-auto w-[140px]"
        />
        <div className="flex items-center gap-4 text-sm text-slate">
          <span>{profile?.display_name || user.email}</span>
          <form action={signOut}>
            <button className="rounded border border-line px-3 py-1.5 text-xs font-medium text-ink">
              登出
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-8 max-w-4xl mx-auto w-full">{children}</main>
    </div>
  );
}
