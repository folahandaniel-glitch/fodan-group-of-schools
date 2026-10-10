import type { MetadataRoute } from "next";

const base = process.env.APP_BASE_URL || "https://fodan-group-of-schools.vercel.app";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/staff", "/news", "/contact", "/login", "/register"].map((p) => ({ url: base + p, changeFrequency: "weekly", priority: p === "/" ? 1 : 0.6 }));
}
