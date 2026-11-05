import type { MetadataRoute } from "next";
import { AI_CRAWLERS } from "@/lib/seo-kit";

const base = process.env.APP_BASE_URL || "https://fodan-group-of-schools.vercel.app";
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: ["/"], disallow: ["/portal", "/api", "/login", "/register", "/reset"] }, { ...{ userAgent: "*", allow: ["/"], disallow: ["/portal", "/api", "/login", "/register", "/reset"] }, userAgent: AI_CRAWLERS }], sitemap: `${base}/sitemap.xml` };
}
