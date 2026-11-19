import type { Diagram } from "./diagram";
import { KEYWORD_DIAGRAMS, familyOf, generateLesson } from "./lesson-gen";
import { conceptFor } from "@/data/concepts";

/** Each weekly topic is taught in three daily periods. Content is built from the scheme of work; diagrams are drawn from the topic. */
export type Period = { day: 1 | 2 | 3; title: string; focus: string; sections: { h: string; body: string }[]; diagrams: Diagram[] };

type Fam = ReturnType<typeof familyOf>;
const DAY2: Record<Fam, Diagram> = {
  maths: { kind: "bar", title: "Worked example: reading the values", caption: "Compare the sizes, then answer the question.", data: "A: 4\nB: 7\nC: 5\nD: 9" },
  science: { kind: "flow", title: "How to investigate", caption: "Follow the steps of a simple experiment.", data: "Ask a question\nPredict\nTest it\nRecord results\nConclude" },
  social: { kind: "table", title: "Compare and contrast", caption: "Fill in the table with examples from your community.", data: "Idea | Example | Why it matters\nMeaning |  | \nExample |  | \nEffect |  | " },
  english: { kind: "table", title: "Examples at a glance", caption: "Study the pattern in each example.", data: "Rule | Example\nStatement | We read.\nQuestion | Do we read?\nCommand | Read." },
  tech: { kind: "flow", title: "Step by step", caption: "Work through the task in order.", data: "Open the program\nDo the task\nSave your work\nClose the program" },
  religious: { kind: "flow", title: "Study the passage", caption: "Read, understand and apply.", data: "Read the passage\nWho is involved?\nWhat happened?\nWhat does it teach?" },
  arts: { kind: "flow", title: "Making it", caption: "From idea to finished piece.", data: "Idea\nSketch\nMake\nShow" },
  general: { kind: "flow", title: "Step by step", caption: "Work through the idea in order.", data: "Learn\nTry\nCheck\nApply" },
};
const DAY3: Diagram = { kind: "cycle", title: "Learn, practise, review", caption: "Repeating this cycle makes learning stick.", data: "Learn\nPractise\nCheck\nReview" };

export function buildPeriods(o: { subject: string; levelName: string; topic: string; content?: string }): Period[] {
  const g = generateLesson({ subject: o.subject, className: o.levelName, topic: o.topic, source: o.content });
  const fam = familyOf(o.subject), key = o.topic.toLowerCase();
  const d1 = KEYWORD_DIAGRAMS.find((k) => k.re.test(key))?.d;
  const words = [...new Set(o.topic.replace(/[^A-Za-z ]/g, " ").split(/\s+/).filter((w) => w.length > 3))].slice(0, 6);
  const cp = conceptFor(o.topic, o.subject);
  const steps = g.body.presentation.split("\n").map((s) => s.replace(/^Step \d+ \(about \d+ min\): /, "")).filter(Boolean);
  return [
    { day: 1, title: "Day 1: Introduction and key ideas", focus: "Meet the topic, its words and its main ideas.", diagrams: [d1 ?? { kind: "flow", title: "Today's route", caption: "What we will do in this period.", data: "Recall\nLearn the words\nUnderstand the idea\nTry an example" }],
      sections: [{ h: "Objectives", body: g.body.objectives }, { h: "What we already know", body: g.body.previousKnowledge }, { h: "Key words", body: words.length ? words.join(", ") + "." : o.topic }, { h: cp ? `Explanation: ${cp.title}` : "The main idea", body: cp ? cp.explain : steps[0] ?? `Learn what ${o.topic} means.` }] },
    { day: 2, title: "Day 2: Examples and illustration", focus: "See the idea worked out with examples and a picture.", diagrams: [DAY2[fam]],
      sections: [{ h: "Worked example", body: cp ? cp.example : steps[1] ?? `Work through examples on ${o.topic}.` }, ...(cp ? [{ h: "Key points", body: cp.points.map((p) => "• " + p).join("\n") }] : []), { h: "Teacher and learner activities", body: `Teacher: ${g.body.teacherActivities}\nLearners: ${g.body.studentActivities}` }, { h: "Check yourself", body: g.body.evaluation }] },
    { day: 3, title: "Day 3: Practice and application", focus: "Practise, link to real life and revise.", diagrams: [DAY3],
      sections: [{ h: "Practice", body: cp ? `Try two or three questions like the worked example on ${o.topic.toLowerCase()}. Check each answer by working backwards or by estimating.` : steps[2] ?? `Practise ${o.topic} with a partner.` }, { h: "Link to real life", body: `Find one place at home or in your community where ${o.topic.toLowerCase()} is used and tell the class.` }, { h: "Summary", body: cp ? `${cp.title}: ${cp.points.join(" ")}` : g.body.summary }, { h: "Revise for the test", body: `Say the key words aloud, redraw today's diagram from memory, and ask a parent or friend to quiz you on ${o.topic}.` }] },
  ];
}
