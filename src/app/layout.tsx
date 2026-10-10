import type { Metadata, Viewport } from "next";
import { Fraunces, Figtree } from "next/font/google";
import "./globals.css";
import { InstallPrompt } from "@/components/install-prompt";

const display = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", axes: ["opsz"] });
const sans = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });

const rawBase = (process.env.APP_BASE_URL ?? "").trim();
const base = /^https?:\/\/[^\s]+$/.test(rawBase) ? rawBase : "https://fodan-group-of-schools.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: { default: "Fodan College International — Fodan Group of Schools", template: "%s · Fodan Group of Schools" },
  description: "Fodan Group of Schools — Fodan College International. School portal for students, parents and staff: assignments, CBT, results, report cards and study resources.",
  applicationName: "Fodan Group of Schools Portal",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/favicon-32.png", sizes: "32x32" }, { url: "/icons/favicon-48.png", sizes: "48x48" }],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "Fodan Portal", statusBarStyle: "default" },
  openGraph: {
    title: "Fodan College International", siteName: "Fodan Group of Schools",
    description: "Learn. Practise. Test. Improve.", type: "website", images: ["/brand/og.jpg"],
  },
  twitter: { card: "summary_large_image", title: "Fodan College International", images: ["/brand/og.jpg"] },
};

export const viewport: Viewport = { themeColor: "#0a1b3f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
