import Link from "next/link";

// Shared across every current and future sign-up form (agency inquiry,
// individual waitlist, and later the real self-serve sign-up flow), per
// Dan's requirement that people confirm they've read all three legal
// documents before signing up. A plain HTML checkbox (not client state) so
// it works the same way in both the current client-form components and any
// future plain server-rendered form.
export function LegalConsentCheckbox() {
  return (
    <label className="flex items-start gap-2 text-xs leading-relaxed text-slate">
      <input
        type="checkbox"
        name="agreed_to_terms"
        value="yes"
        required
        className="mt-0.5 shrink-0"
      />
      <span>
        我已閱讀並理解
        <Link
          href="/legal/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand underline"
        >
          隱私權保護聲明
        </Link>
        、
        <Link
          href="/legal/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand underline"
        >
          使用授權合約
        </Link>
        與
        <Link
          href="/legal/disclaimer"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand underline"
        >
          AI 內容免責聲明
        </Link>
        。
      </span>
    </label>
  );
}
