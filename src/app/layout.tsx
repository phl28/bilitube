import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BiliTube - Connect YouTube & Bilibili",
  description: "See comments from both YouTube and Bilibili in one place",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="sticky top-0 z-50 bg-header-bg border-b border-border">
          <div className="flex items-center h-14 px-6">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <svg width="28" height="28" viewBox="0 0 100 100" className="shrink-0">
                <defs>
                  <linearGradient id="biliTubeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00aeec" />
                    <stop offset="100%" stopColor="#ff0033" />
                  </linearGradient>
                </defs>
                <path d="M 32 36 L 20 16" stroke="url(#biliTubeGrad)" strokeWidth="9" strokeLinecap="round" />
                <path d="M 68 36 L 80 16" stroke="url(#biliTubeGrad)" strokeWidth="9" strokeLinecap="round" />
                <rect x="10" y="30" width="80" height="58" rx="18" fill="url(#biliTubeGrad)" />
                <polygon points="40,46 64,59 40,72" fill="white" />
              </svg>
              <span className="text-lg font-semibold tracking-tight">
                Bili<span className="text-accent">Tube</span>
              </span>
            </Link>
          </div>
        </header>
        <main className="flex-1 w-full">
          {children}
        </main>
      </body>
    </html>
  );
}
