import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-paper/90 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="Native English Studio"
            width={1389}
            height={288}
            priority
            className="h-8 w-auto"
          />
        </Link>

        <nav className="flex items-center gap-3 sm:gap-5">
          <Link
            href="/signup/agency"
            className="hidden text-sm font-medium text-ink hover:text-brand sm:inline"
          >
            機構方案
          </Link>
          <Link
            href="/signup/individual"
            className="hidden text-sm font-medium text-ink hover:text-brand sm:inline"
          >
            學生與家長
          </Link>
          <Link
            href="/login"
            className="rounded bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-brand transition-colors"
          >
            登入
          </Link>
        </nav>
      </div>
    </header>
  );
}
