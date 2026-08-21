"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------
// Batch 28 (item 6): the "forgot password" half of Dan's request. Linked
// from /login ("忘記密碼？"). Works for every role — parent, agency
// admin, advisor, student — since they all share the same /login page
// and the same Supabase Auth users table; there's nothing role-specific
// about resetting a password.
//
// supabase.auth.resetPasswordForEmail() always returns success (no
// error) whether or not the email is actually registered — Supabase
// does this deliberately so this page can never be used to check which
// emails have accounts. The success message below is written to be
// accurate either way.
//
// The email itself uses Supabase's "Reset password" template
// (supabase/email-templates/reset-password.html, already branded as of
// Batch 25) and its {{ .ConfirmationURL }} points here via `redirectTo`,
// landing on /auth/reset-password to actually set the new password.
// ---------------------------------------------------------------------
export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    setLoading(false);
    if (resetError) {
      setError("寄送失敗，請稍後再試。");
      return;
    }
    setSent(true);
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

      <div className="w-full max-w-sm rounded border border-line bg-surface p-6 shadow-card">
        {sent ? (
          <>
            <h1 className="font-display text-lg font-bold text-ink mb-1">請查看您的信箱</h1>
            <p className="text-sm text-slate leading-relaxed">
              如果 <b>{email}</b> 是已註冊的帳號，我們已寄出一封重設密碼的信件，請點選信中的連結設定新密碼。此連結有時效性，如未收到信件，請確認垃圾郵件匣，或稍後再試一次。
            </p>
            <Link href="/login" className="mt-4 inline-block text-xs text-brand underline">
              返回登入頁面
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h1 className="font-display text-lg font-bold text-ink mb-1">忘記密碼</h1>
            <p className="text-sm text-slate mb-6">
              請輸入您註冊時使用的電子郵件，我們會寄送一封重設密碼的信件給您。
            </p>

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

            {error && (
              <p className="text-sm text-danger mb-4" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full rounded bg-ink py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "寄送中…" : "寄送重設密碼信件"}
            </button>

            <Link href="/login" className="mt-4 inline-block text-xs text-slate underline">
              返回登入頁面
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
