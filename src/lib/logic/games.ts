/** Educational games. Every game has Easy, Medium and Hard. Questions are generated from a seed, so the server can re-create a round and mark it. */
export type Level = "easy" | "medium" | "hard";
export const LEVELS: Level[] = ["easy", "medium", "hard"];
export type Q = { q: string; options: string[]; answer: number };
export type GameDef = { key: string; title: string; icon: string; blurb: string };

export const GAMES: GameDef[] = [
  { key: "math-sprint", title: "Math Sprint", icon: "➕", blurb: "Quick sums, differences, products and quotients." },
  { key: "times-tables", title: "Times Tables", icon: "✖️", blurb: "Multiplication facts and missing factors." },
  { key: "number-patterns", title: "Number Patterns", icon: "🔢", blurb: "Spot the rule and find the next number." },
  { key: "percent-fractions", title: "Fractions & Percent", icon: "🍕", blurb: "Halves, quarters, percentages of amounts." },
  { key: "spelling-bee", title: "Spelling Bee", icon: "🐝", blurb: "Pick the correctly spelt word." },
  { key: "word-scramble", title: "Word Scramble", icon: "🔤", blurb: "Unscramble the letters." },
  { key: "vocabulary", title: "Word Match", icon: "📖", blurb: "Synonyms and opposites." },
  { key: "grammar", title: "Grammar Gym", icon: "✍️", blurb: "Tenses, plurals and correct usage." },
  { key: "science-quiz", title: "Science Quiz", icon: "🔬", blurb: "Living things, matter, energy and the Earth." },
  { key: "geography", title: "Geography Trek", icon: "🌍", blurb: "Nigeria, Africa and the world." },
  { key: "bible-quiz", title: "Bible Quiz", icon: "✝️", blurb: "People, places and stories of the Bible." },
];
export const gameOf = (k: string) => GAMES.find((g) => g.key === k);

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
type R = () => number;
const ri = (r: R, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
const pick = <T,>(r: R, xs: T[]): T => xs[Math.floor(r() * xs.length)];
function shuffle<T>(r: R, xs: T[]): T[] { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/** Builds a question from the right answer and wrong ones (deduplicated), in shuffled order. */
function mc(r: R, q: string, right: string | number, wrong: (string | number)[]): Q {
  const seen = new Set<string>([String(right)]); const w: string[] = [];
  for (const x of wrong) { const s = String(x); if (!seen.has(s)) { seen.add(s); w.push(s); } if (w.length === 3) break; }
  let n = 1; while (w.length < 3 && typeof right === "number") { const s = String(right + n * (n % 2 ? 1 : -1) * 2); n++; if (!seen.has(s)) { seen.add(s); w.push(s); } }
  const opts = shuffle(r, [String(right), ...w]);
  return { q, options: opts, answer: opts.indexOf(String(right)) };
}
const near = (r: R, v: number, span = 5) => [v + ri(r, 1, span), v - ri(r, 1, span), v + ri(r, 2, span + 3), v - ri(r, 2, span + 3), v + 10, v - 10];

type Gen = (r: R, l: Level) => Q;
const gMath: Gen = (r, l) => {
  if (l === "easy") { const a = ri(r, 1, 20), b = ri(r, 1, 20); return r() < 0.5 ? mc(r, `${a} + ${b} = ?`, a + b, near(r, a + b)) : mc(r, `${a + b} − ${a} = ?`, b, near(r, b)); }
  if (l === "medium") { const t = ri(r, 0, 2); if (t === 0) { const a = ri(r, 12, 99), b = ri(r, 12, 99); return mc(r, `${a} + ${b} = ?`, a + b, near(r, a + b, 9)); } if (t === 1) { const a = ri(r, 2, 12), b = ri(r, 2, 12); return mc(r, `${a} × ${b} = ?`, a * b, near(r, a * b, 6)); } const b = ri(r, 2, 12), c = ri(r, 2, 12); return mc(r, `${b * c} ÷ ${b} = ?`, c, near(r, c, 4)); }
  const t = ri(r, 0, 2); if (t === 0) { const a = ri(r, 11, 25), b = ri(r, 6, 19); return mc(r, `${a} × ${b} = ?`, a * b, near(r, a * b, 12)); } if (t === 1) { const a = ri(r, 2, 9), b = ri(r, 2, 9), c = ri(r, 10, 60); return mc(r, `${a} × ${b} + ${c} = ?`, a * b + c, near(r, a * b + c, 9)); } const a = ri(r, 100, 900), b = ri(r, 100, 900); return mc(r, `${a} + ${b} − ${Math.min(a, b)} = ?`, Math.max(a, b), near(r, Math.max(a, b), 30));
};
const gTimes: Gen = (r, l) => {
  const max = l === "easy" ? 5 : l === "medium" ? 12 : 20; const a = ri(r, 2, max), b = ri(r, 2, l === "hard" ? 15 : 12);
  if (l === "hard" && r() < 0.5) return mc(r, `? × ${b} = ${a * b}`, a, near(r, a, 3));
  return mc(r, `${a} × ${b} = ?`, a * b, [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, a * b + 2]);
};
const gPattern: Gen = (r, l) => {
  let s: number[], nx: number, rule: string;
  if (l === "easy") { const st = ri(r, 1, 20), d = ri(r, 2, 6); s = [0, 1, 2, 3].map((i) => st + i * d); nx = st + 4 * d; rule = ""; }
  else if (l === "medium") { if (r() < 0.5) { const st = ri(r, 1, 5), m = ri(r, 2, 4); s = [0, 1, 2, 3].map((i) => st * m ** i); nx = st * m ** 4; } else { const st = ri(r, 50, 99), d = ri(r, 3, 9); s = [0, 1, 2, 3].map((i) => st - i * d); nx = st - 4 * d; } rule = ""; }
  else { if (r() < 0.5) { const o = ri(r, 1, 4); s = [0, 1, 2, 3].map((i) => (i + o) ** 2); nx = (4 + o) ** 2; } else { const a = ri(r, 1, 4), b = ri(r, 2, 6); s = [a, b]; for (let i = 2; i < 6; i++) s.push(s[i - 1] + s[i - 2]); nx = s[5] + s[4]; s = s.slice(0, 5); nx = s[3] + s[4]; } rule = ""; }
  return mc(r, `${s.join(", ")}, … What comes next?${rule}`, nx, near(r, nx, 4));
};
const gPercent: Gen = (r, l) => {
  if (l === "easy") { const n = ri(r, 1, 20) * 4, f = pick(r, [[2, "half"], [4, "a quarter"]] as [number, string][]); return mc(r, `What is ${f[1]} of ${n}?`, n / f[0], near(r, n / f[0], 4)); }
  if (l === "medium") { const p = pick(r, [10, 20, 25, 50]), n = ri(r, 1, 20) * 20; return mc(r, `What is ${p}% of ${n}?`, (n * p) / 100, near(r, (n * p) / 100, 6)); }
  const p = pick(r, [5, 15, 30, 35, 60, 75]), n = ri(r, 2, 20) * 20; return mc(r, `What is ${p}% of ${n}?`, (n * p) / 100, near(r, (n * p) / 100, 8));
};

const SPELL: Record<Level, string[]> = {
  easy: ["friend", "school", "because", "teacher", "family", "people", "animal", "beautiful", "water", "yellow", "monkey", "Sunday"],
  medium: ["necessary", "separate", "believe", "receive", "calendar", "library", "weather", "February", "different", "interesting", "answer", "knowledge"],
  hard: ["accommodate", "conscience", "embarrass", "maintenance", "occurrence", "pharmacy", "rhythm", "privilege", "environment", "entrepreneur", "questionnaire", "bureaucracy"],
};
function misspell(r: R, w: string): string {
  const c = w.toLowerCase(), i = ri(r, 1, Math.max(1, c.length - 3)); const t = ri(r, 0, 3);
  let m = t === 0 ? c.slice(0, i) + c[i + 1] + c[i] + c.slice(i + 2) : t === 1 ? c.slice(0, i) + c.slice(i + 1) : t === 2 ? c.slice(0, i) + c[i] + c.slice(i) : c.replace(/[aeiou]/, (v) => (v === "e" ? "i" : v === "i" ? "e" : v === "a" ? "e" : "a"));
  if (m === c) m = c + c[c.length - 1];
  return w[0] === w[0].toUpperCase() ? m[0].toUpperCase() + m.slice(1) : m;
}
const gSpell: Gen = (r, l) => { const w = pick(r, SPELL[l]); return mc(r, "Which spelling is correct?", w, [misspell(r, w), misspell(r, w), misspell(r, w), misspell(r, w) + "e", misspell(r, w) + "s"]); };

const SCRAM: Record<Level, string[]> = {
  easy: ["apple", "books", "chair", "green", "house", "light", "mango", "plant", "river", "table", "water", "bread"],
  medium: ["teacher", "library", "kitchen", "monkey", "village", "picture", "morning", "garden", "market", "animal", "number", "sister"],
  hard: ["education", "adventure", "discovery", "important", "knowledge", "mountain", "wonderful", "community", "chocolate", "beautiful", "elephant", "yesterday"],
};
const gScramble: Gen = (r, l) => {
  const w = pick(r, SCRAM[l]); let s = w; for (let k = 0; k < 6 && s === w; k++) s = shuffle(r, w.split("")).join("");
  return mc(r, `Unscramble: ${s.toUpperCase()}`, w, shuffle(r, SCRAM[l].filter((x) => x !== w && x.length === w.length).concat(SCRAM[l].filter((x) => x !== w))));
};

type Bank = [string, string, string, string, string][];
const VOCAB: Record<Level, Bank> = {
  easy: [["Opposite of “hot”", "cold", "warm", "red", "big"], ["Opposite of “big”", "small", "tall", "wide", "long"], ["Opposite of “happy”", "sad", "glad", "kind", "loud"], ["Same meaning as “begin”", "start", "end", "stop", "wait"], ["Opposite of “up”", "down", "over", "high", "left"], ["Same meaning as “fast”", "quick", "slow", "late", "soft"], ["Opposite of “day”", "night", "noon", "week", "dawn"], ["Same meaning as “little”", "small", "huge", "heavy", "loud"]],
  medium: [["Same meaning as “enormous”", "huge", "tiny", "narrow", "calm"], ["Opposite of “ancient”", "modern", "old", "broken", "dusty"], ["Same meaning as “brave”", "courageous", "timid", "lazy", "polite"], ["Opposite of “generous”", "selfish", "kind", "wealthy", "gentle"], ["Same meaning as “rapid”", "swift", "slow", "steady", "silent"], ["Opposite of “victory”", "defeat", "battle", "peace", "prize"], ["Same meaning as “assist”", "help", "hinder", "watch", "ignore"], ["Opposite of “expand”", "shrink", "grow", "stretch", "spread"]],
  hard: [["Same meaning as “benevolent”", "kindly", "hostile", "careless", "timid"], ["Opposite of “scarce”", "plentiful", "rare", "precious", "costly"], ["Same meaning as “meticulous”", "careful", "sloppy", "hasty", "rude"], ["Opposite of “transparent”", "opaque", "clear", "fragile", "bright"], ["Same meaning as “reluctant”", "unwilling", "eager", "ready", "cheerful"], ["Opposite of “optimistic”", "pessimistic", "hopeful", "realistic", "joyful"], ["Same meaning as “abundant”", "plentiful", "scanty", "ordinary", "bitter"], ["Opposite of “temporary”", "permanent", "brief", "fleeting", "recent"]],
};
const GRAM: Record<Level, Bank> = {
  easy: [["She ___ to school every day.", "goes", "go", "going", "gone"], ["Plural of “child”", "children", "childs", "childes", "childrens"], ["They ___ playing football.", "are", "is", "am", "was"], ["I have ___ apple.", "an", "a", "the", "some"], ["Plural of “box”", "boxes", "boxs", "boxen", "boxies"], ["He ___ a book yesterday.", "read", "reads", "reading", "readed"], ["The cat sat ___ the mat.", "on", "at", "by", "to"], ["Past tense of “run”", "ran", "runned", "running", "runs"]],
  medium: [["Neither of the boys ___ here.", "is", "are", "were", "be"], ["I have lived here ___ 2015.", "since", "for", "from", "during"], ["She is ___ than her sister.", "taller", "more tall", "tallest", "most tall"], ["Plural of “knife”", "knives", "knifes", "knifs", "knivess"], ["He asked me ___ I was going.", "where", "were", "wear", "whose"], ["Past participle of “break”", "broken", "broke", "breaked", "breaking"], ["The books are ___.", "theirs", "their's", "theirs'", "there's"], ["If it rains, we ___ at home.", "will stay", "would stayed", "stayed", "stays"]],
  hard: [["Had I known, I ___ come earlier.", "would have", "will have", "would", "had"], ["The committee ___ divided on the issue.", "was", "were being", "have", "are"], ["Choose the correct sentence", "Whom did you meet?", "Who did you meet to?", "Whom you did meet?", "Who whom meet you?"], ["“Affect” or “effect”: The rain will ___ the match.", "affect", "effect", "effects", "affects'"], ["Each of the students ___ a prize.", "received", "were receiving", "have received", "receive"], ["He suggested that she ___ early.", "leave", "leaves", "left", "leaving"], ["Not only the pupils but also the teacher ___ late.", "was", "were", "are", "have"], ["Correct word: Please ___ me your pen.", "lend", "borrow", "loan to", "lent"]],
};
const SCI: Record<Level, Bank> = {
  easy: [["Which part of a plant takes in water?", "Roots", "Leaves", "Flower", "Fruit"], ["What do we call animals that eat only plants?", "Herbivores", "Carnivores", "Omnivores", "Insects"], ["Which planet do we live on?", "Earth", "Mars", "Venus", "Jupiter"], ["Water freezes into…", "Ice", "Steam", "Smoke", "Dew"], ["Which sense organ do we use to see?", "Eyes", "Ears", "Nose", "Skin"], ["The Sun is a…", "Star", "Planet", "Moon", "Comet"], ["Which is a liquid?", "Milk", "Stone", "Wood", "Air"], ["How many legs does an insect have?", "Six", "Four", "Eight", "Ten"]],
  medium: [["Plants make food by…", "Photosynthesis", "Respiration", "Digestion", "Evaporation"], ["Which gas do humans breathe out?", "Carbon dioxide", "Oxygen", "Nitrogen", "Hydrogen"], ["The force that pulls things to Earth is…", "Gravity", "Friction", "Magnetism", "Pressure"], ["Which organ pumps blood?", "Heart", "Lungs", "Liver", "Kidney"], ["Water turning into vapour is called…", "Evaporation", "Condensation", "Melting", "Freezing"], ["Which is a good conductor of electricity?", "Copper", "Rubber", "Plastic", "Wood"], ["The centre of an atom is the…", "Nucleus", "Electron", "Cell", "Orbit"], ["Which vitamin do we get from sunlight?", "Vitamin D", "Vitamin C", "Vitamin A", "Vitamin K"]],
  hard: [["The powerhouse of the cell is the…", "Mitochondrion", "Nucleus", "Ribosome", "Vacuole"], ["The chemical symbol for sodium is…", "Na", "So", "S", "Sd"], ["Which blood cells fight infection?", "White blood cells", "Red blood cells", "Platelets", "Plasma"], ["pH of a neutral solution is…", "7", "0", "14", "1"], ["Speed = distance divided by…", "Time", "Mass", "Force", "Energy"], ["Which layer of Earth is liquid iron and nickel?", "Outer core", "Crust", "Mantle", "Inner core"], ["The SI unit of force is the…", "Newton", "Joule", "Watt", "Pascal"], ["DNA is found mainly in the…", "Nucleus", "Cell wall", "Cytoplasm", "Membrane"]],
};
const GEO: Record<Level, Bank> = {
  easy: [["What is the capital of Nigeria?", "Abuja", "Lagos", "Kano", "Ibadan"], ["Which colours are on the Nigerian flag?", "Green and white", "Red and blue", "Black and gold", "Blue and white"], ["Which is the largest continent?", "Asia", "Africa", "Europe", "Australia"], ["Which ocean is the biggest?", "Pacific", "Atlantic", "Indian", "Arctic"], ["How many states are in Nigeria?", "36", "30", "24", "42"], ["River Niger and River Benue meet at…", "Lokoja", "Lagos", "Kano", "Jos"], ["Which direction does the Sun rise?", "East", "West", "North", "South"], ["Nigeria is in which continent?", "Africa", "Asia", "Europe", "America"]],
  medium: [["Capital of Ghana?", "Accra", "Kumasi", "Lomé", "Dakar"], ["The longest river in Africa is the…", "Nile", "Niger", "Congo", "Zambezi"], ["Mount Kilimanjaro is in…", "Tanzania", "Kenya", "Uganda", "Ethiopia"], ["Capital of Kenya?", "Nairobi", "Mombasa", "Kampala", "Kigali"], ["The Sahara is a…", "Desert", "Forest", "Lake", "Plateau"], ["Capital of Egypt?", "Cairo", "Alexandria", "Luxor", "Giza"], ["Which Nigerian city is called the Centre of Excellence?", "Lagos", "Abuja", "Port Harcourt", "Enugu"], ["Lake Chad is shared by Nigeria, Niger, Chad and…", "Cameroon", "Ghana", "Benin", "Togo"]],
  hard: [["Capital of Australia?", "Canberra", "Sydney", "Melbourne", "Perth"], ["Which line divides the Earth into North and South?", "Equator", "Prime Meridian", "Tropic of Cancer", "Date Line"], ["Which Nigerian river forms the Delta?", "Niger", "Benue", "Kaduna", "Ogun"], ["Capital of Canada?", "Ottawa", "Toronto", "Vancouver", "Montreal"], ["Highest mountain in the world?", "Everest", "K2", "Kilimanjaro", "Denali"], ["The Strait between Spain and Morocco?", "Gibraltar", "Bosphorus", "Hormuz", "Malacca"], ["Nigeria’s highest mountain is…", "Chappal Waddi", "Zuma Rock", "Olumo Rock", "Mambilla"], ["The currency of South Africa?", "Rand", "Naira", "Cedi", "Shilling"]],
};
const BIBLE: Record<Level, Bank> = {
  easy: [["Who built the ark?", "Noah", "Moses", "David", "Peter"], ["Who was swallowed by a big fish?", "Jonah", "Elijah", "Daniel", "Paul"], ["Who killed Goliath?", "David", "Saul", "Samson", "Joshua"], ["Where was Jesus born?", "Bethlehem", "Nazareth", "Jerusalem", "Egypt"], ["How many disciples did Jesus choose?", "12", "10", "7", "3"], ["Who was thrown into the lions’ den?", "Daniel", "Joseph", "Samuel", "Gideon"], ["Who was Jesus’ mother?", "Mary", "Martha", "Ruth", "Esther"], ["What was the first book of the Bible?", "Genesis", "Exodus", "Psalms", "Matthew"]],
  medium: [["Who led Israel out of Egypt?", "Moses", "Aaron", "Joshua", "Caleb"], ["Who was sold by his brothers?", "Joseph", "Benjamin", "Reuben", "Judah"], ["Who denied Jesus three times?", "Peter", "John", "Thomas", "Judas"], ["How many plagues struck Egypt?", "10", "7", "12", "5"], ["Who was the strongest man in the Bible?", "Samson", "Goliath", "Saul", "Abner"], ["Which prophet went up in a whirlwind?", "Elijah", "Elisha", "Isaiah", "Jeremiah"], ["Who wrote most of the New Testament letters?", "Paul", "Peter", "John", "James"], ["Who was the first king of Israel?", "Saul", "David", "Solomon", "Samuel"]],
  hard: [["Which book comes right after Acts?", "Romans", "Galatians", "Hebrews", "James"], ["Who was the mother of Samuel?", "Hannah", "Ruth", "Naomi", "Rachel"], ["Which judge was a woman?", "Deborah", "Esther", "Miriam", "Abigail"], ["How many books are in the New Testament?", "27", "39", "66", "24"], ["Who interpreted Pharaoh’s dreams?", "Joseph", "Daniel", "Moses", "Aaron"], ["On which island did John write Revelation?", "Patmos", "Crete", "Cyprus", "Malta"], ["Who replaced Judas among the apostles?", "Matthias", "Barnabas", "Silas", "Timothy"], ["Which king asked for wisdom?", "Solomon", "David", "Hezekiah", "Josiah"]],
};
const fromBank = (bank: Record<Level, Bank>): Gen => (r, l) => { const b = pick(r, bank[l]); return mc(r, b[0], b[1], [b[2], b[3], b[4]]); };

const GENS: Record<string, Gen> = {
  "math-sprint": gMath, "times-tables": gTimes, "number-patterns": gPattern, "percent-fractions": gPercent, "spelling-bee": gSpell, "word-scramble": gScramble,
  vocabulary: fromBank(VOCAB), grammar: fromBank(GRAM), "science-quiz": fromBank(SCI), geography: fromBank(GEO), "bible-quiz": fromBank(BIBLE),
};
export const ROUND_SIZE = 10;

/** The questions of a round, identical every time for the same game, level and seed. Repeats within a round are skipped where possible. */
export function buildRound(game: string, level: Level, seed: number): Q[] {
  const g = GENS[game]; if (!g || !LEVELS.includes(level)) return [];
  const r = rng(seed), out: Q[] = [], seen = new Set<string>();
  for (let tries = 0; out.length < ROUND_SIZE && tries < 80; tries++) { const q = g(r, level); const k = q.q + "|" + q.options[q.answer]; if (!seen.has(k)) { seen.add(k); out.push(q); } }
  return out;
}
export function scoreRound(qs: Q[], answers: number[]): number { return qs.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0); }
