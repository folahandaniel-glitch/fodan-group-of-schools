import { describe, expect, it } from "vitest";
import { DEFAULT_PLATFORM, MENU_CATALOGUE, PLATFORM_MODULES, moduleOf, normalisePlatform, pathOn } from "@/lib/platform";
import { normalisePhone } from "@/lib/sms";
import { defaultsFor, permits } from "@/lib/logic/permissions";

describe("Developer switchboard", () => {
  it("lists the fourteen modules, with unbuilt or keyless ones off by default", () => {
    expect(PLATFORM_MODULES.map((m) => m.key)).toEqual(["registration", "attendance", "crm", "hrm", "academics", "notifications", "lms", "cbt", "exams", "sms", "finance", "library", "rewards", "hostel"]);
    expect(DEFAULT_PLATFORM.modules.sms).toBe(false);
    expect(DEFAULT_PLATFORM.modules.library).toBe(false);
    expect(DEFAULT_PLATFORM.modules.hostel).toBe(false);
    expect(DEFAULT_PLATFORM.modules.crm && DEFAULT_PLATFORM.modules.finance && DEFAULT_PLATFORM.modules.cbt).toBe(true);
  });
  it("a switched-off module closes all of its pages, including sub-pages", () => {
    const s = normalisePlatform({ modules: { crm: false } });
    expect(pathOn(s, "/portal/crm")).toBe(false);
    expect(pathOn(s, "/portal/crm/123")).toBe(false);
    expect(pathOn(s, "/portal/hrm")).toBe(true);
  });
  it("a single menu can be switched off while its module stays on", () => {
    const s = normalisePlatform({ menus: { "/portal/payslips": false } });
    expect(pathOn(s, "/portal/payslips")).toBe(false);
    expect(pathOn(s, "/portal/payroll")).toBe(true);
  });
  it("core pages and the dashboard can never be switched off", () => {
    const s = normalisePlatform({ modules: Object.fromEntries(PLATFORM_MODULES.map((m) => [m.key, false])), menus: { "/portal/developer": false, "/portal/settings": false, "/portal": false } });
    for (const p of ["/portal", "/portal/developer", "/portal/settings", "/portal/backend", "/portal/users", "/portal/studio", "/portal/audit", "/portal/exports", "/account"]) expect(pathOn(s, p)).toBe(true);
  });
  it("every menu in the catalogue belongs to a module", () => {
    for (const m of MENU_CATALOGUE) expect(moduleOf(m.href), m.href).not.toBeNull();
  });
  it("ignores junk in saved settings", () => {
    const s = normalisePlatform({ modules: { crm: "yes" }, menus: { nope: false, "/portal/x": "no" } });
    expect(s.modules.crm).toBe(true);
    expect(Object.keys(s.menus)).toHaveLength(0);
  });
});

describe("new modules' permissions", () => {
  const has = (role: string, perm: string) => permits(defaultsFor(role), perm);
  it("finance staff manage fees; teachers cannot", () => {
    for (const r of ["accountant", "bursar", "finance_admin"]) expect(has(r, "fees:manage")).toBe(true);
    expect(has("teacher", "fees:manage") || has("teacher", "fees:view")).toBe(false);
  });
  it("librarian manages the library and everyone can browse", () => {
    expect(has("librarian", "library:manage")).toBe(true);
    expect(has("teacher", "library:manage")).toBe(false);
    expect(has("student", "library:view") && has("parent", "library:view")).toBe(true);
  });
  it("SMS and hostel are for school leaders", () => {
    for (const r of ["principal", "vp_admin", "student_affairs_admin"]) expect(has(r, "sms:manage") && has(r, "hostel:manage")).toBe(true);
    expect(has("teacher", "sms:manage")).toBe(false);
  });
});

describe("phone numbers", () => {
  it("normalises Nigerian numbers", () => {
    expect(normalisePhone("0803 123 4567")).toBe("2348031234567");
    expect(normalisePhone("+234 803 123 4567")).toBe("2348031234567");
    expect(normalisePhone("2348031234567")).toBe("2348031234567");
    expect(normalisePhone("abc")).toBe("");
    expect(normalisePhone("123")).toBe("");
  });
});

import { TIERS, gamePoints, progress, POINTS } from "@/lib/logic/loyalty";
import { GAMES, LEVELS, buildRound, scoreRound } from "@/lib/logic/games";
describe("loyalty and games", () => {
  it("has the 18 loyalty levels in rising order", () => {
    expect(TIERS.map((t) => t.name)).toEqual(["New", "Amateur", "Silver", "Silver Ultra", "New Bronze", "Bronze", "Bronze Ultra", "New Gold", "Gold", "Gold Ultra", "New Premium", "Premium", "Premium Ultra", "Platinum", "New Platinum", "Platinum Ultra", "Emeritus", "Grand Emeritus"]);
    for (let i = 1; i < TIERS.length; i++) expect(TIERS[i].min).toBeGreaterThan(TIERS[i - 1].min);
    expect(progress(0).tier.name).toBe("New");
    expect(progress(99999).tier.name).toBe("Grand Emeritus");
  });
  it("study and work outweigh games, and games are capped daily", () => {
    expect(POINTS.perCorrectWork).toBeGreaterThan(POINTS.perCorrectGame.hard);
    expect(gamePoints("hard", 10, 10, 0)).toBe(POINTS.gameDailyCap);
    expect(gamePoints("easy", 5, 10, POINTS.gameDailyCap)).toBe(0);
  });
  it("every game builds valid Easy, Medium and Hard rounds that are the same for a seed", () => {
    for (const g of GAMES) for (const l of LEVELS) for (const seed of [1, 7, 4242]) {
      const a = buildRound(g.key, l, seed);
      expect(a.length, `${g.key} ${l}`).toBeGreaterThanOrEqual(8);
      expect(JSON.stringify(a)).toBe(JSON.stringify(buildRound(g.key, l, seed)));
      for (const q of a) { expect(q.options).toHaveLength(4); expect(new Set(q.options).size).toBe(4); expect(q.answer).toBeGreaterThanOrEqual(0); }
      expect(scoreRound(a, a.map((q) => q.answer))).toBe(a.length);
    }
  });
});

import { workingDays, overallScore, nextStage, service } from "@/lib/logic/hr";
import { parseNumberLine, parsePoints, cleanDiagram } from "@/lib/logic/diagram";
import { generateLesson, familyOf } from "@/lib/logic/lesson-gen";
describe("HR, diagrams and lesson generator", () => {
  it("counts leave working days, skipping weekends and holidays", () => {
    expect(workingDays("2026-11-16", "2026-11-20")).toBe(5);
    expect(workingDays("2026-11-16", "2026-11-22")).toBe(5);
    expect(workingDays("2026-11-16", "2026-11-20", ["2026-11-18"])).toBe(4);
    expect(workingDays("2026-11-20", "2026-11-16")).toBe(0);
  });
  it("scores appraisals and moves candidates", () => {
    expect(overallScore({ quality: 5, knowledge: 4, punctuality: 3 })).toBe(4);
    expect(overallScore({})).toBe(0);
    expect(nextStage("applied")).toBe("screening");
    expect(nextStage("offer")).toBe("hired");
    expect(nextStage("hired")).toBeNull();
    expect(service("2020-01-15", new Date("2026-11-18"))).toBe("6 yrs 10 mo");
  });
  it("parses diagram data safely", () => {
    expect(parsePoints("Mon: 5\nTue: x\nWed: 8")).toEqual([{ label: "Mon", value: 5 }, { label: "Wed", value: 8 }]);
    expect(parseNumberLine("from: 0\nto: 10\nstep: 2\nmark: 3, 99")).toEqual({ from: 0, to: 10, step: 2, marks: [3] });
    expect(cleanDiagram({ kind: "bar", data: "   " })).toBeNull();
    expect(cleanDiagram({ kind: "nope" as never, data: "x" })).toBeNull();
  });
  it("generates a full note with a fitting diagram", () => {
    const g = generateLesson({ subject: "Basic Science", className: "JSS 1", topic: "The water cycle" });
    expect(familyOf("Basic Science")).toBe("science");
    for (const k of ["objectives", "materials", "presentation", "evaluation", "summary", "assignment"]) expect(g.body[k].length).toBeGreaterThan(20);
    expect(g.diagrams[0].kind).toBe("cycle");
    expect(generateLesson({ subject: "Mathematics", className: "JSS 1", topic: "Statistics" }).diagrams.some((d) => d.kind === "bar")).toBe(true);
  });
});

import { examDays, findClash, generateExamTimetable, overlaps } from "@/lib/logic/exam-tt";
import { minutesFor, normaliseRules, DEFAULT_RULES } from "@/lib/exam-rules";
describe("exam timetable and rules", () => {
  const subj = (names: string[]) => names.map((n, i) => ({ id: n + i, name: n }));
  it("lists school days only", () => {
    expect(examDays("2026-11-20", "2026-11-25", ["2026-11-23"])).toEqual(["2026-11-20", "2026-11-24", "2026-11-25"]);
  });
  it("generates a timetable with no clashes, parallel arms and core subjects first", () => {
    const names = ["Mathematics", "English Studies", "Biology", "Chemistry", "Physics", "Government", "Economics", "Geography"];
    const classes = [{ id: "a", level: 10, subjects: subj(names).map((s) => ({ ...s, id: s.name })) }, { id: "b", level: 10, subjects: subj(names).map((s) => ({ ...s, id: s.name })) }, { id: "c", level: 11, subjects: subj(names.slice(0, 5)).map((s) => ({ ...s, id: s.name })) }];
    const days = examDays("2026-11-16", "2026-11-20");
    const { slots, problems } = generateExamTimetable({ days, sessions: ["08:30", "11:00"], minutes: 60, classes });
    expect(problems).toEqual([]);
    expect(slots.filter((s) => s.classId === "a")).toHaveLength(8);
    for (const c of ["a", "b", "c"]) { const mine = slots.filter((s) => s.classId === c); mine.forEach((s, i) => expect(findClash(mine, s, i)).toBeNull()); }
    expect(slots.find((s) => s.classId === "a" && s.subjectId === "Mathematics")!.day).toBe(days[0]);
    const a = slots.find((s) => s.classId === "a" && s.subjectId === "Biology")!, b = slots.find((s) => s.classId === "b" && s.subjectId === "Biology")!;
    expect([a.day, a.start]).toEqual([b.day, b.start]);
  });
  it("reports when there are too few sessions", () => {
    const { problems } = generateExamTimetable({ days: ["2026-11-16"], sessions: ["08:30"], minutes: 60, classes: [{ id: "a", level: 1, subjects: subj(["Maths", "English"]) }] });
    expect(problems[0]).toMatch(/Add days/);
  });
  it("detects overlaps", () => {
    expect(overlaps({ day: "d", start: "08:30", minutes: 60 }, { day: "d", start: "09:00", minutes: 30 })).toBe(true);
    expect(overlaps({ day: "d", start: "08:30", minutes: 30 }, { day: "d", start: "09:00", minutes: 30 })).toBe(false);
  });
  it("uses timetable time for CA and exams and standard time for the rest", () => {
    expect(minutesFor("ca", DEFAULT_RULES, 45, 30)).toBe(45);
    expect(minutesFor("exam", DEFAULT_RULES, null, 75)).toBe(70);
    expect(minutesFor("classwork", DEFAULT_RULES, null, 99)).toBe(10);
    expect(minutesFor("mock", DEFAULT_RULES, null, 20)).toBe(70);
    expect(normaliseRules({ maxAttempts: 99 }).maxAttempts).toBe(2);
  });
});

import { primaryRows } from "@/data/nerdc-primary";
import { periodQuestions } from "@/lib/logic/qgen";
import { buildPeriods } from "@/lib/logic/periods";
describe("curriculum, periods and auto work", () => {
  it("has Primary 1 to 6 for nine subjects, 15 topics each", () => {
    const rows = primaryRows();
    expect(rows).toHaveLength(6 * 9 * 15);
    expect(new Set(rows.map((r) => r[0]))).toEqual(new Set([1, 2, 3, 4, 5, 6]));
    expect(new Set(rows.map((r) => r[1])).size).toBe(9);
  });
  it("makes five valid medium questions for any subject and level, the same each time", () => {
    for (const subject of ["Mathematics", "English Studies", "Basic Science And Technology", "Social And Citizenship Studies", "Christian Religious Studies", "Digital Technologies", "Physical And Health Education", "Cultural And Creative Arts", "Pre-Vocational Studies", "Biology", "Economics", "Further Mathematics"]) {
      for (const level of [1, 4, 8, 11]) {
        const a = periodQuestions({ subject, level, topic: "Fractions and percentages", day: 2, kind: "classwork", topicId: "t1" });
        expect(a, `${subject} ${level}`).toHaveLength(5);
        for (const q of a) { expect(q.options).toHaveLength(4); expect(new Set(q.options).size).toBe(4); expect(q.answer).toBeGreaterThanOrEqual(0); expect(q.options[q.answer]).toBeTruthy(); }
        expect(JSON.stringify(a)).toBe(JSON.stringify(periodQuestions({ subject, level, topic: "Fractions and percentages", day: 2, kind: "classwork", topicId: "t1" })));
      }
    }
  });
  it("builds three daily periods, each with a diagram", () => {
    const p = buildPeriods({ subject: "Basic Science And Technology", levelName: "Basic 4", topic: "Food chains" });
    expect(p.map((x) => x.day)).toEqual([1, 2, 3]);
    for (const x of p) { expect(x.diagrams.length).toBeGreaterThan(0); expect(x.sections.length).toBeGreaterThan(2); }
    expect(p[0].diagrams[0].title).toMatch(/food chain/i);
  });
});

import { SECTIONS, checkValue, progress as detailProgress, validate, allFields } from "@/lib/logic/details";
describe("HRM details", () => {
  it("has the compulsory segments for staff, students and parents", () => {
    const ids = (r: "staff" | "student" | "parent") => SECTIONS[r].map((s) => s.id);
    for (const id of ["personal", "contact", "identity", "bank", "health", "nok"]) expect(ids("staff")).toContain(id);
    expect(ids("student")).toContain("health"); expect(ids("parent")).toContain("bank");
  });
  it("checks NIN, BVN, account numbers and phones", () => {
    const f = (k: string) => allFields("staff").find((x) => x.key === k)!;
    expect(checkValue(f("nin"), "12345678901")).toBe(""); expect(checkValue(f("nin"), "1234")).not.toBe("");
    expect(checkValue(f("bvn"), "1234567890a")).not.toBe(""); expect(checkValue(f("accountNumber"), "0123456789")).toBe("");
    expect(checkValue(f("phone"), "0803 123 4567")).toBe(""); expect(checkValue(f("phone"), "")).toBe("Required");
    expect(checkValue(f("gender"), "Robot")).not.toBe("");
  });
  it("is complete only when everything and a picture are present", () => {
    expect(Object.keys(validate("staff", {})).length).toBe(allFields("staff").length);
    expect(detailProgress("staff", {}, false).complete).toBe(false);
  });
});
