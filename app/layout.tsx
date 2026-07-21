import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter covers our English/util text (numbers, labels, code-like data).
// Chinese display/body fonts (Noto Serif TC / Noto Sans TC) are loaded via
// the <link> tags below rather than next/font, since next/font's Google Fonts
// subsetting for CJK families can be inconsistent — a plain stylesheet link
// is the most reliable way to guarantee full Traditional Chinese glyph coverage.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-util",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Native English Studio",
  description: "學生 · 顧問 · 家長 平台 — Native English Studio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@500;700&family=Noto+Sans+TC:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body bg-paper text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
