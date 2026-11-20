import { GRAM, SCI, GEO, BIBLE, VOCAB, rng } from "./games";
import { familyOf } from "./lesson-gen";

/** Medium-level multiple-choice questions for a lesson period. The same topic, day and kind always give the same five questions. */
export type GenQ = { text: string; options: string[]; answer: number; explanation: string };

type R = () => number;
const ri = (r: R, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
const pick = <T,>(r: R, xs: T[]): T => xs[Math.floor(r() * xs.length)];
function shuffle<T>(r: R, xs: T[]): T[] { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export const hashSeed = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

function mk(r: R, text: string, right: string | number, wrong: (string | number)[], explanation: string): GenQ {
  const seen = new Set<string>([String(right)]), w: string[] = [];
  for (const x of wrong) { const s = String(x); if (!seen.has(s)) { seen.add(s); w.push(s); } if (w.length === 3) break; }
  let n = 1; while (w.length < 3 && typeof right === "number") { const s = String(right + n * (n % 2 ? 1 : -1) * 2); n++; if (!seen.has(s)) { seen.add(s); w.push(s); } }
  while (w.length < 3) w.push("None of the above" + " ".repeat(w.length));
  const options = shuffle(r, [String(right), ...w]);
  return { text, options, answer: options.indexOf(String(right)), explanation };
}
const near = (r: R, v: number, span = 5) => [v + ri(r, 1, span), v - ri(r, 1, span), v + ri(r, 2, span + 3), v - ri(r, 2, span + 3), v + 10, v - 10];
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** Mathematics at a level of difficulty that suits the class (1 to 12) and the topic. */
function maths(r: R, level: number, topic: string): GenQ {
  const t = topic.toLowerCase();
  if (/fraction|decimal/.test(t) && level >= 4) { const d = pick(r, [2, 3, 4, 5, 6, 8, 10]), a = ri(r, 1, d - 1), b = ri(r, 1, d - 1), s = a + b; return mk(r, `What is ${a}/${d} + ${b}/${d}? (give the simplest form)`, s % d === 0 ? String(s / d) : `${s / gcd(s, d)}/${d / gcd(s, d)}`, [`${a + b}/${d * 2}`, `${a}/${d + b}`, `${s + 1}/${d}`], "Add the numerators when the denominators are the same, then simplify."); }
  if (/percent|interest|profit|loss/.test(t) && level >= 5) { const p = pick(r, [10, 20, 25, 30, 40, 50]), n = ri(r, 2, 20) * 20; return mk(r, `Find ${p}% of ${n}.`, (n * p) / 100, near(r, (n * p) / 100, 6), `${p}% of ${n} = ${p}/100 × ${n}.`); }
  if (/area|perimeter|volume/.test(t) && level >= 3) { const l = ri(r, 4, 15), w = ri(r, 2, l); return r() < 0.5 ? mk(r, `A rectangle is ${l} cm long and ${w} cm wide. What is its area in cm²?`, l * w, [l + w, 2 * (l + w), l * w + w, l * w - l], "Area = length × width.") : mk(r, `A rectangle is ${l} cm long and ${w} cm wide. What is its perimeter in cm?`, 2 * (l + w), [l * w, l + w, 2 * l + w, 4 * l], "Perimeter = 2 × (length + width)."); }
  if (/ratio|proportion|rate/.test(t) && level >= 5) { const a = ri(r, 2, 6), b = ri(r, 2, 6), k = ri(r, 2, 9); return mk(r, `Share ${k * (a + b)} naira in the ratio ${a}:${b}. What is the larger share?`, k * Math.max(a, b), near(r, k * Math.max(a, b), 8), "Divide by the total number of parts, then multiply by the parts you need."); }
  if (level >= 7 && /algebra|equation|simultaneous|expression|linear/.test(t)) { const x = ri(r, 2, 12), a = ri(r, 2, 9), b = ri(r, 1, 20); return mk(r, `Solve for x: ${a}x + ${b} = ${a * x + b}`, x, near(r, x, 4), "Subtract the constant, then divide by the coefficient of x."); }
  if (level >= 10 && /quadratic|factor/.test(t)) { const a = ri(r, 1, 6), b = ri(r, 1, 6); return mk(r, `Solve x² − ${a + b}x + ${a * b} = 0. The larger root is:`, Math.max(a, b), near(r, Math.max(a, b), 3), "Factorise into (x − a)(x − b) = 0."); }
  if (level >= 10 && /indices|index|logarithm|surd/.test(t)) { const b = pick(r, [2, 3, 5]), n = ri(r, 2, 5); return mk(r, `Evaluate ${b}^${n}.`, b ** n, [b * n, b ** (n - 1), b ** n + b, (b + 1) ** n], "Multiply the base by itself n times."); }
  if (level <= 2) { const a = ri(r, 1, level === 1 ? 9 : 40), b = ri(r, 1, level === 1 ? 9 : 40); return r() < 0.6 ? mk(r, `${a} + ${b} = ?`, a + b, near(r, a + b, 3), "Count on from the bigger number.") : mk(r, `${a + b} − ${a} = ?`, b, near(r, b, 3), "Subtraction undoes addition."); }
  if (level <= 4) { const a = ri(r, 2, level === 3 ? 9 : 12), b = ri(r, 2, 12); return r() < 0.55 ? mk(r, `${a} × ${b} = ?`, a * b, [a * (b + 1), a * (b - 1), (a + 1) * b, a * b + 2], "Use the times table.") : mk(r, `${a * b} ÷ ${a} = ?`, b, near(r, b, 4), "Division is the opposite of multiplication."); }
  if (level <= 6) {
    const k = ri(r, 0, 2), a = ri(r, 12, 99);
    if (k === 0) { const b = ri(r, 12, 99); return mk(r, `${a} + ${b} = ?`, a + b, near(r, a + b, 10), "Add the ones, then the tens."); }
    if (k === 1) { const m = ri(r, 3, 9); return mk(r, `${a} × ${m} = ?`, a * m, near(r, a * m, 12), "Multiply the tens and ones separately, then add."); }
    const d = ri(r, 3, 9), q = ri(r, 12, 60); return mk(r, `${d * q} ÷ ${d} = ?`, q, near(r, q, 6), "Use long division.");
  }
  const a = ri(r, 3, 12), b = ri(r, 2, 9), c = ri(r, 10, 50);
  return r() < 0.5 ? mk(r, `Work out ${a} × ${b} + ${c}.`, a * b + c, near(r, a * b + c, 9), "Multiply first (BODMAS), then add.") : mk(r, `Simplify ${a}(${b} + ${c}) − ${a * c}.`, a * b, near(r, a * b, 8), "Expand the bracket and collect like terms.");
}

type Bank = [string, string, string, string, string][];
const TECH: Bank = [["What does CPU stand for?","Central Processing Unit","Central Power Unit","Computer Personal Unit","Control Program Unit"], ["Which of these is a storage device?","Flash drive","Monitor","Keyboard","Speaker"], ["The programs that run on a computer are called…","Software","Hardware","Firmware only","Cables"], ["Which key deletes the character to the left of the cursor?","Backspace","Enter","Shift","Tab"], ["A computer virus is…","A harmful program","A type of keyboard","A kind of monitor","A storage unit"], ["What is the name of the screen display on a computer?","Desktop","Folder","Cable","Port"], ["Which software is used to create a presentation?","Slide software","Spreadsheet","Antivirus","Browser"], ["Where are files saved permanently on a computer?","Hard disk","RAM only","Cache","Mouse"], ["A set of step-by-step instructions to solve a problem is a…","Algorithm","Virus","Folder","Cable"], ["Which of these is a search engine?","A website that finds information","A type of printer","A computer virus","A keyboard key"], ["The extension .docx belongs to a…","Word document","Picture","Song","Video"], ["Rows and columns of cells are found in a…","Spreadsheet","Presentation","Browser","Paint program"], ["Which device is used to type letters into a computer?", "Keyboard", "Monitor", "Speaker", "Printer"], ["Which of these is an output device?", "Monitor", "Keyboard", "Mouse", "Scanner"], ["The brain of the computer is the…", "CPU", "Mouse", "Screen", "Cable"], ["A program that lets you browse the internet is a…", "Web browser", "Printer", "Keyboard", "Folder"], ["A strong password should…", "Mix letters, numbers and symbols", "Be your name", "Be 1234", "Be shared with friends"], ["Software that helps write letters and reports is a…", "Word processor", "Spreadsheet", "Browser", "Antivirus"], ["Information stored on a computer with a name is a…", "File", "Cable", "Port", "Screen"], ["Sending messages electronically is called…", "Email", "Printing", "Typing", "Scanning"]];
const PHE: Bank = [["Which nutrient builds and repairs the body?","Protein","Water only","Fat only","Starch only"], ["The final stage of exercise to relax the body is the…","Cool-down","Warm-up","Sprint","Jump"], ["A balanced diet contains…","All food classes","Only sweets","Only fruit","Only meat"], ["Which is a field event?","Long jump","100 metres","Relay","Hurdles"], ["Malaria is spread by the…","Female anopheles mosquito","Housefly","Cockroach","Tsetse fly"], ["Which is a good habit for health?","Washing hands with soap","Skipping meals","Sleeping late always","Drinking dirty water"], ["Why should we warm up before exercise?", "To prepare the body and prevent injury", "To get tired", "To sleep", "To eat"], ["Which food group gives us energy?", "Carbohydrates", "Water", "Vitamins only", "Fibre only"], ["Which is a track event?", "100 metres race", "Long jump", "Shot put", "High jump"], ["First aid for a small cut is to…", "Clean it and cover it", "Ignore it", "Rub sand on it", "Pull it open"], ["How many players are on a football team on the pitch?", "11", "9", "7", "15"], ["Regular exercise helps to…", "Keep the heart and muscles strong", "Weaken the body", "Cause sickness", "Reduce sleep"]];
const ARTS: Bank = [["The art of folding paper is called…","Origami","Pottery","Batik","Mosaic"], ["Cloth patterns made by waxing and dyeing are called…","Batik","Collage","Sculpture","Weaving"], ["A drum is an example of a…","Percussion instrument","Wind instrument","String instrument","Keyboard instrument"], ["Which shows the tune of a song?","Melody","Rhythm","Texture","Outline"], ["Carving a figure from wood or stone is…","Sculpture","Printing","Dyeing","Weaving"], ["Mixing red and yellow gives…","Orange","Green","Purple","Brown"], ["Which is a warm colour?","Red","Blue","Green","Violet"], ["A play is performed on a…","Stage","Canvas","Loom","Kiln"], ["Pictures made by pasting cut shapes together are…","Collages","Carvings","Songs","Poems"], ["The person who guides actors in a play is the…","Director","Painter","Weaver","Potter"], ["Which colour is a secondary colour?","Orange","Red","Blue","Yellow"], ["Pottery is made from…","Clay","Wire","Glass only","Paper only"], ["A person who designs buildings is an…","Architect","Actor","Singer","Dancer"], ["The beat pattern of a song is its…","Rhythm","Colour","Texture","Shade"], ["Which are primary colours?", "Red, blue and yellow", "Green, orange and purple", "Black, white and grey", "Pink, brown and cream"], ["Mixing blue and yellow gives…", "Green", "Orange", "Purple", "Brown"], ["Tie and dye is a type of…", "Textile decoration", "Singing", "Dancing", "Acting"], ["Beating a drum makes a sound called…", "Percussion", "Wind", "String", "Vocal"], ["Making objects from clay is called…", "Modelling", "Weaving", "Printing", "Dyeing"], ["A play performed on stage is called…", "Drama", "Pottery", "Collage", "Poster"]];
const VOC: Bank = [["The money a business earns from sales is called…","Revenue","Debt","Tax","Wages"], ["Which of these is a source of capital for a small business?","Savings","Rent","Wages","Electricity bills"], ["A person who starts a business is called a…","Entrepreneur","Customer","Employee","Auditor"], ["The place where farm produce is bought and sold is a…","Market","Nursery","Barn","Laboratory"], ["Which tool is used to cut cloth?","Scissors","Spade","Hoe","Cutlass only"], ["A record of money received and spent is a…","Cash book","Menu","Calendar","Poster"], ["Seeds are first grown in a…","Nursery","Kitchen","Garage","Library"], ["Which gives energy in the diet?","Carbohydrates","Water only","Vitamins only","Fibre only"], ["Loss happens when…","Cost price is more than selling price","Selling price is more than cost price","Both prices are equal","Nothing is sold"], ["Good customer care means…","Treating customers politely and honestly","Ignoring complaints","Raising prices","Closing early"], ["Farming is the growing of…", "Crops and rearing of animals", "Machines", "Clothes", "Houses"], ["A balanced diet contains…", "All the food classes in the right amounts", "Only sweets", "Only meat", "Only water"], ["Saving money means…", "Keeping some money for later", "Spending it all", "Losing it", "Giving it all away"], ["A tool used for digging in the garden is a…", "Hoe", "Needle", "Pen", "Spoon"], ["Profit is made when…", "Selling price is more than cost price", "Cost price is more than selling price", "Nothing is sold", "Goods are given away"], ["Poultry farming is the rearing of…", "Birds such as chickens", "Cattle", "Fish", "Goats"]];
const FRENCH: Bank = [["How do you say 'good morning' in French?", "Bonjour", "Bonsoir", "Au revoir", "Merci"], ["What does 'merci' mean?", "Thank you", "Please", "Goodbye", "Sorry"], ["How do you say 'goodbye' in French?", "Au revoir", "Bonjour", "Salut", "S'il vous plaît"], ["What does 'le livre' mean?", "The book", "The pen", "The table", "The door"], ["The French word for 'cat' is…", "chat", "chien", "cheval", "poisson"], ["What is 'trois'?", "Three", "Two", "Four", "Five"], ["'Je m'appelle Ada' means…", "My name is Ada", "I am tired", "I like Ada", "Ada is here"], ["How do you say 'please' in French?", "S'il vous plaît", "Merci", "Pardon", "Bonjour"], ["'Rouge' is the colour…", "Red", "Blue", "Green", "Yellow"], ["The French word for 'school' is…", "école", "maison", "livre", "chaise"], ["'Comment ça va?' means…", "How are you?", "What time is it?", "Where are you?", "Who are you?"], ["'Dix' is the number…", "Ten", "Six", "Nine", "Twelve"]];
const bankMed = (b: Record<string, Bank>, wide = false) => (wide ? [...(b.easy ?? []), ...(b.medium ?? []), ...(b.hard ?? [])] : b.medium ?? []);

function fromBank(r: R, bank: Bank, topic: string): GenQ {
  const [q, right, w1, w2, w3] = pick(r, bank);
  return mk(r, q, right, [w1, w2, w3], `Revise the lesson on ${topic}.`);
}

/**
 * Five medium questions for a lesson period. Mathematics is generated for the class level and topic.
 * Other subjects draw from the subject's question set; teachers can add topic-specific questions to the question bank.
 */
export function periodQuestions(o: { subject: string; level: number; topic: string; day: number; kind: string; topicId: string; wide?: boolean }): GenQ[] {
  const r = rng(hashSeed(`${o.topicId}|${o.day}|${o.kind}`));
  const fam = familyOf(o.subject), sub = o.subject.toLowerCase();
  const pool: Bank | null =
    fam === "science" ? (bankMed(SCI as never, o.wide) as Bank) : fam === "religious" ? (bankMed(BIBLE as never, o.wide) as Bank) :
    fam === "social" ? (bankMed(GEO as never, o.wide) as Bank) : /french/.test(sub) ? FRENCH : fam === "tech" ? TECH : fam === "english" ? ([...bankMed(GRAM as never, o.wide), ...bankMed(VOCAB as never, o.wide)] as Bank) :
    /physical|health|sport/.test(sub) ? PHE : /art|music|drama|creative/.test(sub) ? ARTS : fam === "maths" ? null : VOC;
  const out: GenQ[] = [], seen = new Set<string>();
  let guard = 0;
  while (out.length < 5 && guard++ < 60) {
    const q = fam === "maths" ? maths(r, o.level, o.topic) : fromBank(r, pool ?? VOC, o.topic);
    if (!seen.has(q.text) && q.options.length === 4 && new Set(q.options).size === 4) { seen.add(q.text); out.push(q); }
  }
  return out;
}
