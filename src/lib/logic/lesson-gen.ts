import type { Diagram } from "./diagram";

/** Drafts a lesson note in the standard template from a subject, class and topic. The teacher then edits it. */
export type GenInput = { subject: string; className: string; topic: string; subtopic?: string; duration?: number; source?: string };
export type Draft = { body: Record<string, string>; diagrams: Diagram[] };

type Family = "maths" | "english" | "science" | "social" | "tech" | "religious" | "arts" | "general";
export function familyOf(subject: string): Family {
  const s = subject.toLowerCase();
  if (/math|arith|further/.test(s)) return "maths";
  if (/english|literature|yoruba|igbo|hausa|french|language|verbal|comprehension/.test(s)) return "english";
  if (/science|biology|chemistry|physics|agric|health|nutrition|environment/.test(s)) return "science";
  if (/social|civic|government|econom|geograph|history|commerce|account|business|security|studies/.test(s)) return "social";
  if (/comput|ict|technology|basic tech|data|coding/.test(s)) return "tech";
  if (/bible|crk|crs|irk|islam|christian|religio|moral/.test(s)) return "religious";
  if (/art|music|drama|home|craft|physical|pe\b/.test(s)) return "arts";
  return "general";
}

const KEYWORD_DIAGRAMS: { re: RegExp; d: Diagram }[] = [
  { re: /water cycle/, d: { kind: "cycle", title: "The water cycle", caption: "Water moves between the Earth and the atmosphere.", data: "Evaporation\nCondensation\nPrecipitation\nCollection" } },
  { re: /photosynth/, d: { kind: "flow", title: "Photosynthesis", caption: "Plants make their own food using light.", data: "Sunlight\nChlorophyll in leaf\nWater + carbon dioxide\nGlucose + oxygen" } },
  { re: /food chain|food web/, d: { kind: "flow", title: "A food chain", caption: "Arrows show the direction of energy.", data: "Sun\nGrass\nGrasshopper\nFrog\nSnake\nEagle" } },
  { re: /life cycle|metamorph/, d: { kind: "cycle", title: "Life cycle of a butterfly", caption: "Complete metamorphosis has four stages.", data: "Egg\nLarva\nPupa\nAdult" } },
  { re: /digest/, d: { kind: "flow", title: "The path of food", caption: "Food moves through the alimentary canal.", data: "Mouth\nOesophagus\nStomach\nSmall intestine\nLarge intestine\nAnus" } },
  { re: /states? of matter|change of state/, d: { kind: "cycle", title: "Changes of state", caption: "Heating and cooling change the state of matter.", data: "Solid\nLiquid\nGas" } },
  { re: /nitrogen cycle/, d: { kind: "cycle", title: "The nitrogen cycle", caption: "Nitrogen is recycled through living things and soil.", data: "Atmospheric nitrogen\nNitrogen fixation\nNitrates in soil\nAbsorbed by plants\nDecay returns nitrogen" } },
  { re: /fraction|decimal/, d: { kind: "pie", title: "Fractions of a whole", caption: "The whole is divided into equal parts. Shade the part named.", data: "Shaded: 3\nNot shaded: 5" } },
  { re: /percent/, d: { kind: "bar", title: "Comparing percentages", caption: "Percent means out of one hundred.", data: "Test 1: 45\nTest 2: 60\nTest 3: 75\nTest 4: 90" } },
  { re: /integer|number line|addition|subtract|negative|counting|number/, d: { kind: "numberline", title: "Number line", caption: "Move right to add and left to subtract.", data: "from: -5\nto: 10\nstep: 1\nmark: -2, 4" } },
  { re: /statistic|data|graph|chart|bar|mean|average|mode|median/, d: { kind: "bar", title: "Pupils' favourite fruit", caption: "Read the bar chart to answer the questions.", data: "Mango: 12\nOrange: 9\nBanana: 15\nPawpaw: 6" } },
  { re: /demand|supply|price/, d: { kind: "line", title: "Demand and price", caption: "Quantity demanded falls as price rises.", data: "N100: 90\nN200: 70\nN300: 50\nN400: 30\nN500: 15" } },
  { re: /population|census/, d: { kind: "line", title: "Population growth", caption: "Population in thousands over the years.", data: "2000: 120\n2005: 150\n2010: 190\n2015: 240\n2020: 300" } },
  { re: /government|arms of government|constitution/, d: { kind: "flow", title: "Arms of government", caption: "Each arm has its own duties.", data: "Legislature makes laws\nExecutive carries out laws\nJudiciary interprets laws" } },
  { re: /tense|parts of speech|noun|verb|adjective|adverb|pronoun/, d: { kind: "table", title: "Parts of speech", caption: "Examples of each part of speech.", data: "Part of speech | Example\nNoun | school\nVerb | write\nAdjective | tall\nAdverb | quickly" } },
  { re: /essay|letter|composition|writing|story|narrative/, d: { kind: "flow", title: "Planning a piece of writing", caption: "Good writing has a clear order.", data: "Plan\nIntroduction\nBody paragraphs\nConclusion\nEdit" } },
  { re: /computer|hardware|input|output|storage/, d: { kind: "flow", title: "How a computer works", caption: "Data is processed into information.", data: "Input\nProcessing\nStorage\nOutput" } },
  { re: /climate|weather|rain/, d: { kind: "bar", title: "Monthly rainfall (mm)", caption: "Rainfall is highest in the rainy season.", data: "Apr: 120\nMay: 180\nJun: 250\nJul: 280\nAug: 200" } },
];
const FAMILY_DIAGRAM: Record<Family, Diagram | null> = {
  maths: { kind: "numberline", title: "Number line", caption: "Use the number line to show the working.", data: "from: 0\nto: 20\nstep: 2\nmark: 6, 14" },
  english: { kind: "flow", title: "Lesson route", caption: "How the lesson is organised.", data: "Read\nIdentify\nExplain\nPractise" },
  science: { kind: "flow", title: "Scientific method", caption: "Scientists follow these steps.", data: "Observe\nAsk a question\nPredict\nTest\nConclude" },
  social: { kind: "flow", title: "From idea to understanding", caption: "A summary of the lesson route.", data: "Define\nGive examples\nCompare\nApply" },
  tech: { kind: "flow", title: "Problem solving steps", caption: "Steps to solve a problem.", data: "Understand\nPlan\nDo\nCheck" },
  religious: { kind: "flow", title: "Reading a passage", caption: "A way to study the text.", data: "Read\nUnderstand\nReflect\nApply" },
  arts: { kind: "flow", title: "Creative process", caption: "From idea to finished work.", data: "Idea\nPlan\nCreate\nShare" },
  general: null,
};

const MATERIALS: Record<Family, string> = {
  maths: "Chalkboard and chalk, charts, number cards, rulers, graph paper, counters, textbook.",
  english: "Chalkboard, flash cards, passage chart, dictionary, recommended textbook, audio of the passage where available.",
  science: "Charts and models, real objects or specimens, chalkboard, markers, simple apparatus, textbook.",
  social: "Maps or charts, pictures, newspaper cuttings, chalkboard, markers, textbook.",
  tech: "Computer or projector where available, charts of devices, chalkboard, textbook.",
  religious: "Holy book (Bible/Quran), picture charts, chalkboard, hymn or songbook where suitable.",
  arts: "Illustrations, real materials, models, chalkboard, markers.",
  general: "Chalkboard, charts, pictures, textbook.",
};
const VERBS: Record<Family, string[]> = {
  maths: ["define and state the rule for", "work out correct examples of", "solve problems on", "apply to real-life situations"],
  english: ["explain the meaning of", "identify and use correctly", "write correct sentences or passages on", "answer questions on"],
  science: ["define and describe", "identify and label the parts or stages of", "explain the importance of", "give everyday examples of"],
  social: ["define and explain", "list and discuss examples of", "state the importance of", "relate to their own community"],
  tech: ["define and explain", "identify the main parts of", "demonstrate the use of", "apply to simple tasks"],
  religious: ["read and narrate", "state the main lessons of", "explain the meaning of", "apply to daily life"],
  arts: ["describe and explain", "identify the elements of", "practise and demonstrate", "appreciate"],
  general: ["define", "explain", "give examples of", "apply what they learnt about"],
};
const EVAL_Q: Record<Family, string[]> = {
  maths: ["Solve one worked example on the board without help.", "Explain each step you used.", "Give one real-life use of this topic."],
  english: ["Use the new words or structure in sentences of your own.", "Read the sentence and identify the error.", "Explain the meaning in your own words."],
  science: ["Define the key term.", "Draw and label the diagram shown.", "Give two everyday examples."],
  social: ["Define the key term.", "State three points on the topic.", "Why is this important in our community?"],
  tech: ["Name the parts or steps involved.", "Demonstrate one task.", "Explain why it is useful."],
  religious: ["Narrate the story or passage in your own words.", "State two lessons from it.", "How can you apply it this week?"],
  arts: ["Describe your work.", "Name the techniques used.", "Share one thing you can improve."],
  general: ["Define the key term.", "Give two examples.", "Explain it in your own words."],
};

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
const plain = (html: string) => html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

export function generateLesson(inp: GenInput): Draft {
  const topic = inp.topic.trim(), subject = inp.subject.trim() || "the subject", cls = inp.className.trim() || "the class";
  const fam = familyOf(subject), T = topic || "the topic", dur = inp.duration && inp.duration > 0 ? inp.duration : 40;
  const v = VERBS[fam];
  const src = inp.source ? plain(inp.source) : "";
  const keyPoints = src ? src.split(/(?<=[.!?])\s+/).filter((x) => x.length > 25).slice(0, 5).map((x) => clip(x, 220)) : [];
  const objectives = [`By the end of the lesson, learners should be able to:`, `1. ${v[0]} ${T};`, `2. ${v[1]} ${T};`, `3. ${v[2]} ${T}; and`, `4. ${v[3]} ${T}.`].join("\n");
  const presentation = [
    `Step 1 (about ${Math.round(dur * 0.25)} min): Introduce ${T}. Explain the key terms and write them on the board.${keyPoints[0] ? ` Teaching point: ${keyPoints[0]}` : ""}`,
    `Step 2 (about ${Math.round(dur * 0.3)} min): Develop the main content with worked examples and the diagram or chart provided.${keyPoints[1] ? ` Teaching point: ${keyPoints[1]}` : ""}`,
    `Step 3 (about ${Math.round(dur * 0.25)} min): Guided practice. Learners try examples while the teacher moves round and corrects.${keyPoints[2] ? ` Teaching point: ${keyPoints[2]}` : ""}`,
    ...(keyPoints.slice(3).map((k, i) => `Further point ${i + 1}: ${k}`)),
  ].join("\n");
  const body: Record<string, string> = {
    subtopic: inp.subtopic?.trim() || "",
    duration: `${dur} minutes`, period: "", averageAge: "", classSize: "", sex: "Mixed",
    previousKnowledge: `Learners have met earlier ideas related to ${T} in previous lessons and everyday life.`,
    objectives,
    materials: MATERIALS[fam],
    references: `Approved ${subject} scheme of work and recommended textbook for ${cls}. Note: add the exact title and page numbers.`,
    introduction: `The teacher greets the class, revises the previous lesson with two quick questions, then states the topic "${T}" and asks learners what they already know about it.`,
    presentation,
    teacherActivities: `Explains, demonstrates with the chart or diagram, asks guiding questions, gives examples, and corrects errors kindly.`,
    studentActivities: `Listen, answer questions, copy the key points, take part in the guided practice, and ask questions.`,
    evaluation: EVAL_Q[fam].map((q, i) => `${i + 1}. ${q}`).join("\n"),
    summary: `The teacher and learners summarise the main points of ${T} on the board: the meaning, the key steps or facts, and one example.`,
    conclusion: `The teacher marks the evaluation exercise, clears misconceptions and praises good work.`,
    assignment: `Write short notes on ${T} and answer three questions from the textbook exercise. Submit at the next lesson.`,
  };
  const key = `${topic} ${inp.subtopic ?? ""}`.toLowerCase();
  const diagrams: Diagram[] = [];
  const hit = KEYWORD_DIAGRAMS.find((k) => k.re.test(key));
  if (hit) diagrams.push(hit.d);
  else if (FAMILY_DIAGRAM[fam]) diagrams.push(FAMILY_DIAGRAM[fam]!);
  if (fam === "maths" && !diagrams.some((d) => d.kind === "bar")) diagrams.push({ kind: "bar", title: "Practice data", caption: "Edit the values to suit your examples.", data: "A: 4\nB: 7\nC: 5\nD: 9" });
  return { body, diagrams };
}
