// SEO and AI discoverability profile. Shared by robots, sitemap, llms.txt and JSON-LD.
export function siteBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "https://fodan-group-of-schools.vercel.app";
  return raw.replace(/\/+$/, "");
}

export const SEO_PROFILE = {
  "name": "Fodan Group of Schools",
  "type": "EducationalOrganization",
  "description": "Fodan Group of Schools, Fodan College International: admissions, academics and a portal for students, parents and staff with assignments, CBT, results and report cards.",
  "services": [
    "Admissions",
    "Nursery, primary and secondary education",
    "CBT and assignments",
    "Results and report cards"
  ]
} as const;

export const MAINTAINER = { name: "Fodan Softnet", phone: "+2348067578112", whatsapp: "https://wa.me/2348067578112" } as const;

// Crawlers that power Google, Bing and AI assistants (ChatGPT, Claude, Perplexity, Gemini, Copilot).
export const AI_CRAWLERS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "anthropic-ai", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot", "CCBot", "Meta-ExternalAgent", "Amazonbot", "DuckAssistBot", "cohere-ai", "YouBot"];

export function organizationJsonLd() {
  const url = siteBaseUrl();
  return {
    "@context": "https://schema.org",
    "@type": SEO_PROFILE.type,
    name: SEO_PROFILE.name,
    description: SEO_PROFILE.description,
    url,
    logo: `${url}/icon.png`,
    makesOffer: SEO_PROFILE.services.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s } })),
  };
}
