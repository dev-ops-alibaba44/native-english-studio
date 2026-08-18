"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

// Landing point after clicking the invite-email link (Batch 23):
// /auth/callback exchanges the one-time code for a real session and
// sends the person here — they're logged in at this point but have no
// password yet, so this is the one screen that has to exist before
// anything else in the app is usable for a newly agency-created
// student.
export default function SetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("密碼至少需要 8 個字元。");
      return;
    }
    if (password !== confirm) {
      setError("兩次輸入的密碼不一致。");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError("設定密碼失敗，請重新點選邀請信中的連結，或聯絡您的機構顧問。");
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
        <h1 className="font-display text-lg font-bold text-ink mb-1">設定密碼</h1>
        <p className="text-sm text-slate mb-6">
          您的機構已經為您建立帳號，請設定一組密碼以完成登入。
        </p>

        <label className="block text-sm font-medium text-ink mb-1" htmlFor="password">
          新密碼
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border border-line px-3 py-2 mb-4 text-sm focus:border-brand outline-none"
          placeholder="至少 8 個字元"
        />

        <label className="block text-sm font-medium text-ink mb-1" htmlFor="confirm">
          再次輸入密碼
        </label>
        <input
          id="confirm"
          type="password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
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
          {loading ? "設定中…" : "設定密碼並登入"}
        </button>
      </form>
    </main>
  );
}
