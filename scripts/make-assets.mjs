// Generates optimised brand assets from the supplied logo and hero photograph.
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const src = "assets-source/logo-source.png";
mkdirSync("public/brand", { recursive: true });
mkdirSync("public/icons", { recursive: true });

// 1. Transparent-background logo (white -> alpha) without altering proportions.
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < data.length; i += 4) {
  const m = Math.min(data[i], data[i + 1], data[i + 2]);
  const a = Math.max(0, Math.min(255, 255 - (m - 215) * 6.4));
  data[i + 3] = Math.min(data[i + 3], a);
}
const transparent = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
await transparent.clone().trim().resize({ width: 560 }).webp({ quality: 84, alphaQuality: 90 }).toFile("public/brand/logo.webp");
await transparent.clone().trim().resize({ width: 160 }).webp({ quality: 84, alphaQuality: 90 }).toFile("public/brand/logo-sm.webp");

// 2. App icons: logo on white with safe padding (maskable keeps extra padding).
const flat = await sharp(src).resize({ width: 1000 }).png().toBuffer();
async function icon(size, pad, out, bg = "#ffffff") {
  const inner = Math.round(size * (1 - pad * 2));
  const logo = await sharp(flat).resize(inner, inner, { fit: "contain", background: bg }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: logo, gravity: "centre" }]).png().toFile(out);
}
await icon(192, 0.04, "public/icons/icon-192.png");
await icon(512, 0.04, "public/icons/icon-512.png");
await icon(512, 0.14, "public/icons/maskable-512.png");
await icon(180, 0.04, "public/icons/apple-touch-icon.png");
await icon(48, 0.02, "public/icons/favicon-48.png");
await icon(32, 0.02, "public/icons/favicon-32.png");

// 3. Hero + social card.
await sharp("assets-source/hero-source.jpeg").resize({ width: 1024 }).webp({ quality: 78 }).toFile("public/brand/hero.webp");
const og = await sharp(src).resize(520, 520, { fit: "contain", background: "#faf7f0" }).png().toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 4, background: "#faf7f0" } })
  .composite([{ input: og, gravity: "centre" }]).jpeg({ quality: 82 }).toFile("public/brand/og.jpg");
console.log("assets ok");

