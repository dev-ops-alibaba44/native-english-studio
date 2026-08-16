import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/super-admin", label: "總覽" },
  { href: "/super-admin/agencies", label: "機構列表" },
  { href: "/super-admin/individual-subscriptions", label: "個人訂閱" },
  { href: "/super-admin/usage", label: "AI 使用量與成本" },
  { href: "/super-admin/leads", label: "問題與行銷名單" },
];

export default async function SuperAdminLayout({
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

  // Hard gate, not just RLS scoping — this area can see every agency's
  // every student's essays and comments, so unlike the softer per-portal
  // checks elsewhere in the app, wrong-role visitors get sent away
  // outright rather than just seeing RLS-empty data.
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") {
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
      <header className="flex items-center justify-between px-6 py-3 bg-ink border-b border-line">
        <div className="flex items-center gap-3">
          <Image
            src="/logo-white.png"
            alt="Native English"
            width={1288}
            height={280}
            className="h-auto w-[140px]"
          />
          <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-semibold text-white">
            SUPER ADMIN
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-white/80">
          <span>{profile?.display_name || user.email}</span>
          <form action={signOut}>
            <button className="rounded border border-white/30 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10">
              登出
            </button>
          </form>
        </div>
      </header>

      <div className="flex flex-1">
        <nav className="w-56 shrink-0 bg-surface border-r border-line p-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded px-3 py-2 mb-1 text-sm font-medium text-ink hover:bg-brand-tint"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 p-8 max-w-5xl">{children}</main>
      </div>
    </div>
  );
}
