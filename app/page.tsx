import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 text-center">
      <Image
        src="/logo.png"
        alt="Native English"
        width={1389}
        height={288}
        priority
        className="h-auto w-[220px]"
      />

      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          Native English Studio
        </h1>
        <p className="mt-2 text-sm text-slate">
          學生 · 顧問 · 家長 平台 — 專案骨架已就緒
        </p>
      </div>

      <div className="rounded border border-line bg-surface px-5 py-4 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate">
          Batch 1 setup check
        </p>
        <p className="mt-2 text-sm">
          Supabase environment variables:{" "}
          {supabaseConfigured ? (
            <span className="font-semibold text-good">已設定 ✓</span>
          ) : (
            <span className="font-semibold text-danger">
              尚未設定 — 請檢查 .env.local
            </span>
          )}
        </p>
      </div>

      <Link
        href="/login"
        className="rounded bg-ink px-5 py-2.5 text-sm font-semibold text-white"
      >
        前往登入 →
      </Link>
    </main>
  );
}
