import { describe, expect, it } from "vitest";
import { commentFor, gradeFor, normalise, ordinal, rankPositions, totalScore, weightsValid, DEFAULT_COMMENTS, DEFAULT_GRADES } from "@/lib/logic/scoring";
import { checkPassword, validEmail } from "@/lib/logic/password";
import { fromColumns, parseOptionsBlock, parseQuestionDocument } from "@/lib/logic/star-parser";
import { generateAccessCode, normaliseAccessCode } from "@/lib/logic/access-code";
import { eligible, isSenior, needsDepartment, nextLevel, CLASS_LEVELS } from "@/lib/logic/academics";
import { defaultsFor, outranks, permits } from "@/lib/logic/permissions";

describe("10/30/60 academic calculation", () => {
  it("normalises raw scores proportionally", () => {
    expect(normalise(8, 10, 10)).toBe(8);
    expect(normalise(24, 30, 30)).toBe(24);
    expect(normalise(40, 50, 30)).toBe(24); // 80% of a 50-mark CA -> 24/30
    expect(normalise(48, 60, 60)).toBe(48);
    expect(normalise(45, 50, 10)).toBe(9); // assignment out of 50 -> 9/10
  });
  it("clamps and guards bad input", () => {
    expect(normalise(120, 100, 30)).toBe(30);
    expect(normalise(-5, 100, 30)).toBe(0);
    expect(normalise(5, 0, 30)).toBe(0);
  });
  it("matches the worked example 8 + 24 + 54 = 86 -> A", () => {
    const total = totalScore({ assignment: 8, ca: 24, exam: 54 });
    expect(total).toBe(86);
    expect(gradeFor(total).grade).toBe("A");
    expect(commentFor("A")).toBe(DEFAULT_COMMENTS.A);
  });
  it("applies default grade boundaries", () => {
    const g = (n: number) => gradeFor(n, DEFAULT_GRADES).grade;
    expect([g(100), g(70), g(69), g(60), g(59), g(50), g(49), g(45), g(44), g(40), g(39), g(0)]).toEqual(["A", "A", "B", "B", "C", "C", "D", "D", "E", "E", "F", "F"]);
  });
  it("respects custom grading", () => {
    const bands = [{ grade: "P", min: 50, max: 100, remark: "", tone: "" }, { grade: "X", min: 0, max: 49, remark: "", tone: "" }];
    expect(gradeFor(50, bands).grade).toBe("P");
    expect(gradeFor(49.4, bands).grade).toBe("X");
  });
  it("validates configurable weights", () => {
    expect(weightsValid({ assignment: 10, ca: 30, exam: 60 })).toBe(true);
    expect(weightsValid({ assignment: 20, ca: 20, exam: 50 })).toBe(false);
    expect(weightsValid({ assignment: -10, ca: 50, exam: 60 })).toBe(false);
  });
  it("ranks with ties", () => {
    const r = rankPositions([{ id: "a", total: 90 }, { id: "b", total: 80 }, { id: "c", total: 80 }, { id: "d", total: 70 }]);
    expect([r.get("a"), r.get("b"), r.get("c"), r.get("d")]).toEqual([1, 2, 2, 4]);
    expect([ordinal(1), ordinal(2), ordinal(3), ordinal(11), ordinal(22)]).toEqual(["1st", "2nd", "3rd", "11th", "22nd"]);
  });
});

describe("password policy", () => {
  it("accepts strong passwords with letters, numbers and symbols", () => {
    expect(checkPassword("Tr0ub4dor&3x").ok).toBe(true);
    expect(checkPassword("Abcd1234!").ok).toBe(true);
  });
  it("rejects weak ones", () => {
    expect(checkPassword("short1!").ok).toBe(false);
    expect(checkPassword("nonumbers!!").ok).toBe(false);
    expect(checkPassword("NoSymbols1234").ok).toBe(false);
    expect(checkPassword("12345678!").ok).toBe(false);
  });
  it("validates emails", () => {
    expect(validEmail("student@example.com")).toBe(true);
    expect(validEmail("bad@@x")).toBe(false);
    expect(validEmail("nodomain@")).toBe(false);
  });
});

describe("★ question parser", () => {
  it("detects the star, strips it and sets the correct option", () => {
    const r = parseOptionsBlock("A. Lagos B. Abuja★ C. Kano D. Ibadan");
    expect(r.errors).toEqual([]);
    expect(r.correct).toBe("B");
    expect(r.options.map((o) => o.text)).toEqual(["Lagos", "Abuja", "Kano", "Ibadan"]);
    expect(JSON.stringify(r.options)).not.toContain("★");
  });
  it("rejects multiple stars", () => {
    const r = parseOptionsBlock("A. Lagos★ B. Abuja★ C. Kano D. Ibadan");
    expect(r.correct).toBeNull();
    expect(r.errors.join(" ")).toMatch(/More than one/);
  });
  it("rejects a missing star and never guesses", () => {
    const r = parseOptionsBlock("A. Lagos B. Abuja C. Kano D. Ibadan");
    expect(r.correct).toBeNull();
    expect(r.errors.join(" ")).toMatch(/No option is marked/);
  });
  it("parses a numbered document", () => {
    const doc = "1. Capital of Nigeria?\nA. Lagos B. Abuja★ C. Kano D. Ibadan\n\n2. 2 + 2 = ?\nA. 3 B. 5 C. 4★ D. 22";
    const qs = parseQuestionDocument(doc);
    expect(qs).toHaveLength(2);
    expect(qs[0].correct).toBe("B");
    expect(qs[1].correct).toBe("C");
    expect(qs[0].text).toBe("Capital of Nigeria?");
  });
  it("supports spreadsheet columns", () => {
    expect(fromColumns({ question: "Q?", A: "x", B: "y★", C: "z", D: "w" }).correct).toBe("B");
    expect(fromColumns({ question: "Q?", A: "x", B: "y", C: "z", D: "w", correct: "c" }).correct).toBe("C");
    expect(fromColumns({ question: "Q?", A: "x", B: "y", C: "z", D: "w" }).errors.length).toBeGreaterThan(0);
  });
});

describe("access codes", () => {
  it("are well-formed, normalisable and unique", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const c = generateAccessCode();
      expect(c).toMatch(/^FDN-[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/);
      expect(normaliseAccessCode(c.toLowerCase().replace(/-/g, " "))).toBe(c);
      seen.add(c);
    }
    expect(seen.size).toBe(500);
  });
  it("rejects malformed input", () => {
    expect(normaliseAccessCode("FDN-123")).toBe("");
    expect(normaliseAccessCode("")).toBe("");
  });
});

describe("school structure", () => {
  it("defines all 12 levels", () => {
    expect(CLASS_LEVELS).toHaveLength(12);
    expect(CLASS_LEVELS[0].name).toBe("Basic 1");
    expect(CLASS_LEVELS[11].name).toBe("SSS 3");
  });
  it("promotes one level and graduates after SSS 3", () => {
    expect(nextLevel(1)).toBe(2);
    expect(nextLevel(6)).toBe(7); // Basic 6 -> JSS 1
    expect(nextLevel(9)).toBe(10); // JSS 3 -> SSS 1
    expect(nextLevel(12)).toBeNull();
  });
  it("requires a department from SSS 1", () => {
    expect(needsDepartment(9)).toBe(false);
    expect(needsDepartment(10)).toBe(true);
  });
  it("applies default exam eligibility", () => {
    expect(eligible("common_entrance", 5)).toBe(true);
    expect(eligible("common_entrance", 7)).toBe(false);
    expect(eligible("bece", 8)).toBe(true);
    expect(eligible("waec", 10)).toBe(false);
    expect(eligible("jamb", 12)).toBe(true);
  });
  it("evaluates configurable seniority", () => {
    expect(isSenior({ years: 6, qualification: "B.Sc", positionRank: 0 })).toBe(true);
    expect(isSenior({ years: 2, qualification: "B.Sc", positionRank: 0 })).toBe(false);
    expect(isSenior({ years: 8, qualification: "NCE", positionRank: 0 }, { minYears: 5, minPositionRank: 0, requireDegree: true })).toBe(false);
  });
});

describe("permissions", () => {
  it("super admin has everything; teachers cannot approve questions", () => {
    expect(permits(defaultsFor("super_admin"), "settings:edit")).toBe(true);
    expect(permits(defaultsFor("teacher"), "questions:approve")).toBe(false);
    expect(permits(defaultsFor("hod"), "questions:approve")).toBe(true);
    expect(permits(defaultsFor("student"), "students:view")).toBe(false);
    expect(permits(defaultsFor("parent"), "audit:view")).toBe(false);
    expect(permits(defaultsFor("proprietor"), "audit:view")).toBe(true);
  });
  it("enforces the role hierarchy", () => {
    expect(outranks("principal", "teacher")).toBe(true);
    expect(outranks("teacher", "principal")).toBe(false);
    expect(outranks("teacher", "teacher")).toBe(false);
    expect(outranks("super_admin", "proprietor")).toBe(true);
  });
});
