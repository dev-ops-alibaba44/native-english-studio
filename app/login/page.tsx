"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("登入失敗，請確認您的帳號密碼是否正確。");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-6">
      <Image
        src="/logo.png"
        alt="Native English"
        width={1389}
        height={288}
        priority
        className="h-auto w-[200px]"
      />

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded border border-line bg-surface p-6 shadow-card"
      >
        <h1 className="font-display text-lg font-bold text-ink mb-1">登入</h1>
        <p className="text-sm text-slate mb-6">Native English Studio</p>

        <label className="block text-sm font-medium text-ink mb-1" htmlFor="email">
          電子郵件
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-line px-3 py-2 mb-4 text-sm focus:border-brand outline-none"
          placeholder="you@example.com"
        />

        <label className="block text-sm font-medium text-ink mb-1" htmlFor="password">
          密碼
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border border-line px-3 py-2 mb-4 text-sm focus:border-brand outline-none"
          placeholder="••••••••"
        />

        {error && (
          <p className="text-sm text-danger mb-4" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-ink py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "登入中…" : "登入"}
        </button>

        <p className="mt-4 text-xs text-slate">
          尚未有帳號？請聯絡您的機構顧問為您建立帳號。
        </p>
      </form>
    </main>
  );
}
