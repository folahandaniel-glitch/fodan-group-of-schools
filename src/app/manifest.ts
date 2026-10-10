import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fodan Group of Schools Portal",
    short_name: "Fodan Portal",
    description: "Learn. Practise. Test. Improve.",
    start_url: "/portal",
    scope: "/",
    display: "standalone",
    background_color: "#faf7f0",
    theme_color: "#0a1b3f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
