import { describe, expect, it } from "vitest";
import { SITE_TEXT_DEFAULT, siteText } from "@/lib/site-text";

describe("editable website text", () => {
  it("with nothing stored, every field is the original wording", () => {
    const t = siteText({});
    expect(t).toEqual(SITE_TEXT_DEFAULT);
    expect(t.nav.map((n) => n.label)).toContain("Exam Preparation");
    expect(t.sections.portals.title).toBe("One portal for the whole school community");
    expect(t.portalCards).toHaveLength(3);
  });
  it("stored values replace defaults; missing fields and blank single-line text fall back", () => {
    const t = siteText({ siteText: { signInLabel: "  ", registerLabel: "Join us", sections: { about: { title: "Our story" } }, hero: { badgeValue: "A+" }, pages: { staff: { title: "Meet the team", eyebrow: "People" } } } });
    expect(t.signInLabel).toBe("Sign in");
    expect(t.registerLabel).toBe("Join us");
    expect(t.sections.about.title).toBe("Our story");
    expect(t.sections.about.eyebrow).toBe("About us");
    expect(t.sections.structure.title).toBe("From Basic 1 to SSS 3");
    expect(t.hero.badgeValue).toBe("A+");
    expect(t.hero.badgeLabel).toBe("Smart assessment");
    expect(t.pages.staff).toMatchObject({ eyebrow: "People", title: "Meet the team", qualification: "Qualification" });
    expect(t.pages.news.title).toBe("What is happening at Fodan");
  });
  it("lists are replaced whole, but an empty list falls back so the menu can never vanish", () => {
    expect(siteText({ siteText: { nav: [{ href: "/a", label: "A" }] } }).nav).toEqual([{ href: "/a", label: "A" }]);
    expect(siteText({ siteText: { nav: [] } }).nav).toEqual(SITE_TEXT_DEFAULT.nav);
    expect(siteText({ siteText: { portalCards: "bad" } }).portalCards).toEqual(SITE_TEXT_DEFAULT.portalCards);
  });
  it("ignores wrongly typed stored data instead of crashing", () => {
    const t = siteText({ siteText: { hero: { imageAlt: 5 }, sections: { about: "x" }, pages: null } });
    expect(t.hero.imageAlt).toBe(SITE_TEXT_DEFAULT.hero.imageAlt);
    expect(t.sections.about).toEqual(SITE_TEXT_DEFAULT.sections.about);
  });
  it("new page groups (verify, sign-in, errors, contact form) default to the original wording and fall back when blanked", () => {
    const t = siteText({ siteText: { pages: { verify: { validTitle: "Genuine", awardedTo: "  " }, login: { submit: "Enter" } }, contactCategories: [] } });
    expect(t.pages.verify.validTitle).toBe("Genuine");
    expect(t.pages.verify.awardedTo).toBe("Awarded to");
    expect(t.pages.login.submit).toBe("Enter");
    expect(t.pages.notFound.title).toBe("We could not find that page");
    expect(t.pages.contact.sendButton).toBe("Send message");
    expect(t.contactCategories).toEqual(SITE_TEXT_DEFAULT.contactCategories);
    expect(siteText({ siteText: { contactCategories: ["Fees"] } }).contactCategories).toEqual(["Fees"]);
  });
  it("a section sub-heading may be emptied on purpose, other text may not", () => {
    const t = siteText({ siteText: { sections: { structure: { sub: "", title: "" } } } });
    expect(t.sections.structure.sub).toBe("");
    expect(t.sections.structure.title).toBe("From Basic 1 to SSS 3");
  });
});
