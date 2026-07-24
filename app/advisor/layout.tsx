import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/advisor", label: "本週關注" },
  { href: "/advisor/students", label: "學生總覽" },
];

export default async function AdvisorLayout({
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
    .select("display_name")
    .eq("id", user.id)
    .single();

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-3 bg-surface border-b border-line">
        <Image src="/logo.png" alt="Native English" width={1389} height={288} className="h-auto w-[140px]" />
        <div className="flex items-center gap-4 text-sm text-slate">
          <span>{profile?.display_name || user.email}</span>
          <form action={signOut}>
            <button className="rounded border border-line px-3 py-1.5 text-xs font-medium text-ink">
              登出
            </button>
          </form>
        </div>
      </header>

      <div className="flex flex-1">
        <nav className="w-52 shrink-0 bg-surface border-r border-line p-4">
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

        <main className="flex-1 p-8 max-w-4xl">{children}</main>
      </div>
    </div>
  );
}
