import type { MetadataRoute } from "next";

const base = process.env.APP_BASE_URL || "https://fodan-group-of-schools.vercel.app";
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: ["/"], disallow: ["/portal", "/api", "/login", "/register", "/reset"] }], sitemap: `${base}/sitemap.xml` };
}
