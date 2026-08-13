"use client";

import { useState } from "react";
import { submitWaitlistSignup } from "@/app/actions/public";
import { WAITLIST_ROLES, isValidEmail } from "@/lib/public-form-validation";
import { LegalConsentCheckbox } from "./LegalConsentCheckbox";

export function WaitlistForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string) || "";
    const role = (formData.get("role") as string) || "";

    if (!role) {
      setError("請選擇您的身份。");
      return;
    }
    if (!email.trim() || !isValidEmail(email)) {
      setError("請確認電子郵件格式是否正確。");
      return;
    }
    if ((formData.get("agreed_to_terms") as string) !== "yes") {
      setError("請先閱讀並勾選同意隱私權保護聲明、使用授權合約與 AI 內容免責聲明。");
      return;
    }

    setLoading(true);
    const result = await submitWaitlistSignup(formData);
    setLoading(false);

    if (!result.success) {
      setError("送出時發生問題，請稍後再試一次，或直接寄信至 info@nativeenglish.ca。");
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded border border-line bg-surface p-8 text-center shadow-card">
        <h2 className="font-display text-lg font-bold text-ink">
          已收到您的資訊
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate">
          目前平台主要透過合作機構提供服務；開放個人使用時，我們會第一時間以 email
          通知您。若想進一步了解目前的合作機構，也歡迎寄信至{" "}
          <a href="mailto:info@nativeenglish.ca" className="text-brand underline">
            info@nativeenglish.ca
          </a>
          。
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative rounded border border-line bg-surface p-6 shadow-card sm:p-8"
    >
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div>
        <span className="block text-sm font-medium text-ink mb-2">身份 *</span>
        <div className="flex gap-4">
          {WAITLIST_ROLES.map((r) => (
            <label
              key={r.value}
              className="flex items-center gap-2 text-sm text-ink"
            >
              <input type="radio" name="role" value={r.value} required />
              {r.label}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-ink mb-1" htmlFor="name">
            姓名
          </label>
          <input
            id="name"
            name="name"
            type="text"
            className="w-full rounded border border-line px-3 py-2 text-sm focus:border-brand outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1" htmlFor="email">
            電子郵件 *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded border border-line px-3 py-2 text-sm focus:border-brand outline-none"
            placeholder="you@example.com"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-ink mb-1" htmlFor="city">
            所在縣市
          </label>
          <input
            id="city"
            name="city"
            type="text"
            className="w-full rounded border border-line px-3 py-2 text-sm focus:border-brand outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-ink mb-1" htmlFor="notes">
            想告訴我們的其他資訊
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="w-full rounded border border-line px-3 py-2 text-sm focus:border-brand outline-none"
            placeholder="例：目前申請年級、感興趣的國家等"
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="mt-5">
        <LegalConsentCheckbox />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-4 w-full rounded bg-ink py-2.5 text-sm font-semibold text-white hover:bg-brand transition-colors disabled:opacity-60 sm:w-auto sm:px-8"
      >
        {loading ? "送出中…" : "加入候補名單"}
      </button>
    </form>
  );
}
