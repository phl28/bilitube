import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
            <a href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded bg-accent flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <span className="text-lg font-semibold tracking-tight">
                Bili<span className="text-accent">Tube</span>
              </span>
            </a>
          </div>
        </header>
        <main className="flex-1 w-full">
          {children}
        </main>
      </body>
    </html>
  );
}
