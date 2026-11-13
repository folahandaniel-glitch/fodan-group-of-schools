import type { Metadata, Viewport } from "next";
import { Fraunces, Figtree } from "next/font/google";
import "./globals.css";
import { InstallPrompt } from "@/components/install-prompt";
import { themeCss } from "@/lib/themes";
import { resolveTheme } from "@/lib/theme-server";
import { allSettings } from "@/lib/settings";

const display = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", axes: ["opsz"] });
const sans = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });

const rawBase = (process.env.APP_BASE_URL ?? "").trim();
const base = /^https?:\/\/[^\s]+$/.test(rawBase) ? rawBase : "https://fodan-group-of-schools.vercel.app";

const baseMetadata: Metadata = {
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { id } = await resolveTheme();
  return (
    <html lang="en" data-theme={id} className={`${display.variable} ${sans.variable}`}>
      <head><style dangerouslySetInnerHTML={{ __html: themeCss() }} /></head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-strong focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}

/** The base metadata, with the search title, description and share image the Website Studio saved. */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const seo = (((await allSettings()).studio ?? {}) as { seo?: { title?: string; description?: string; keywords?: string; ogFile?: string } }).seo ?? {};
    return {
      ...baseMetadata,
      ...(seo.title ? { title: { default: seo.title, template: "%s · Fodan Group of Schools" } } : {}),
      ...(seo.description ? { description: seo.description } : {}),
      ...(seo.keywords ? { keywords: seo.keywords.split(",").map((k) => k.trim()).filter(Boolean) } : {}),
      ...(seo.title || seo.description || seo.ogFile ? { openGraph: { ...(baseMetadata.openGraph ?? {}), ...(seo.title ? { title: seo.title } : {}), ...(seo.description ? { description: seo.description } : {}), ...(seo.ogFile ? { images: [`/api/files/${seo.ogFile}`] } : {}) } } : {}),
    };
  } catch {
    return baseMetadata;
  }
}
