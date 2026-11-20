/**
 * FODAN Mathematics textbooks, following the NERDC secondary curriculum: a JSS part (JSS1–3) and an SSS
 * part (SSS1–3). Original explanations with worked examples, drawn diagrams, classwork, assignment, a CBT
 * quiz per chapter and a review. Every worked answer below has been checked by hand.
 */

import type { PoeticUnit, PoeticWork } from "./poetic-types";
import { mc, sc, ex, fig, t, byClass } from "./book-kit";
import { JSS_EXTRA } from "./maths-books-extra";
import { SSS_EXTRA } from "./maths-sss-extra";

/* ----------------------------------------------------------------------------------------- diagrams */

const TRIANGLE = fig(
  "The angles of a triangle add up to 180°",
  `<polygon points="40,125 280,125 150,25" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2.5"/>${t(62, 118, "A")}${t(258, 118, "B")}${t(150, 44, "C")}${t(88, 100, "50°")}${t(220, 100, "65°")}${t(150, 76, "x = 65°", 12)}${t(160, 142, "50° + 65° + x = 180°", 11)}`,
);
const AREAS = fig(
  "Shapes and their areas",
  `<rect x="15" y="30" width="80" height="50" fill="#bbf7d0" stroke="#15803d" stroke-width="2"/>${t(55, 100, "Rectangle", 11)}${t(55, 114, "A = l × w", 11)}<polygon points="125,80 205,80 165,30" fill="#fde68a" stroke="#b45309" stroke-width="2"/>${t(165, 100, "Triangle", 11)}${t(165, 114, "A = ½ × b × h", 11)}<circle cx="268" cy="55" r="30" fill="#fbcfe8" stroke="#be185d" stroke-width="2"/>${t(268, 100, "Circle", 11)}${t(268, 114, "A = πr²", 11)}${t(160, 138, "Use π = 22/7 or 3.14", 10, "middle", "#64748b", 600)}`,
);
const barChart = (label: string, bars: [string, number][], max: number) => {
  const w = 34, gap = 14, x0 = 40, base = 120, scale = 90 / max;
  const body = [`<line x1="30" y1="${base}" x2="300" y2="${base}" stroke="#64748b" stroke-width="2"/>`, `<line x1="30" y1="${base}" x2="30" y2="20" stroke="#64748b" stroke-width="2"/>`]
    .concat(bars.map(([n, v], i) => `<rect x="${x0 + i * (w + gap)}" y="${base - v * scale}" width="${w}" height="${v * scale}" rx="4" fill="#60a5fa"/>${t(x0 + i * (w + gap) + w / 2, base - v * scale - 4, String(v), 10)}${t(x0 + i * (w + gap) + w / 2, base + 14, n, 10)}`))
    .join("");
  return fig(label, body, 150);
};
const RIGHT_TRIANGLE = fig(
  "Sides of a right-angled triangle, seen from the angle θ",
  `<polygon points="50,125 250,125 250,35" fill="#e0e7ff" stroke="#4338ca" stroke-width="2.5"/><rect x="236" y="111" width="14" height="14" fill="none" stroke="#4338ca" stroke-width="1.5"/>${t(150, 142, "adjacent")}${t(274, 85, "opposite")}${t(130, 70, "hypotenuse", 11, "middle", "#be185d")}${t(82, 120, "θ", 14)}${t(160, 18, "sin θ = opp/hyp   cos θ = adj/hyp   tan θ = opp/adj", 10, "middle", "#64748b", 600)}`,
  155,
);
const PARABOLA = fig(
  "The graph of y = x² − 5x + 6 crosses the x-axis at x = 2 and x = 3",
  `<line x1="10" y1="100" x2="310" y2="100" stroke="#94a3b8" stroke-width="1.5"/><line x1="60" y1="10" x2="60" y2="140" stroke="#94a3b8" stroke-width="1.5"/><path d="M60,10 Q150,210 240,10" transform="translate(0,0)" fill="none" stroke="#dc2626" stroke-width="2.5"/>${t(120, 114, "2")}${t(180, 114, "3")}<circle cx="120" cy="100" r="4" fill="#1d4ed8"/><circle cx="180" cy="100" r="4" fill="#1d4ed8"/>${t(150, 90, "roots", 10, "middle", "#1d4ed8")}${t(150, 143, "vertex (2.5, −0.25)", 10, "middle", "#64748b", 600)}`,
  150,
);

/* ============================================================================================ JSS */

const jssUnits: PoeticUnit[] = [
  {
    title: "Chapter 1 · Fractions, Decimals and Percentages",
    focus: "Three ways of writing the same part of a whole",
    label: "Chapter 1",
    scene: sc(["🍕", "💯", "🧮"], "#ffe7b3", "#c9e7a5", "A pizza cut in four: 1/4 = 0.25 = 25%."),
    lines: [
      "P|A fraction, a decimal and a percentage can all describe the same amount. Half of something is 1/2, or 0.5, or 50%.",
      "H|Adding and subtracting fractions",
      "P|Make the denominators (bottom numbers) the same, then add or subtract the numerators (top numbers).",
      ex("Work out 3/4 + 2/3", ["The lowest common denominator of 4 and 3 is 12.", "3/4 = 9/12 and 2/3 = 8/12.", "9/12 + 8/12 = 17/12 = 1 5/12."]),
      "H|Multiplying and dividing fractions",
      "P|To multiply, multiply the tops and multiply the bottoms. To divide, turn the second fraction upside down and multiply.",
      ex("Work out 2 1/2 × 1 1/5", ["Change to improper fractions: 5/2 × 6/5.", "Cancel the 5s: 1/2 × 6/1 = 3.", "The answer is 3."]),
      "H|Changing between fractions, decimals and percentages",
      "P|To change a fraction to a percentage, multiply by 100. To change a percentage to a fraction, put it over 100 and simplify.",
      ex("Write 0.35 as a fraction and as a percentage", ["0.35 = 35/100 = 7/20.", "0.35 × 100 = 35%."]),
      "H|Percentage of an amount",
      ex("Find 15% of ₦8,000 and increase ₦8,000 by 15%", ["15% of 8,000 = 15/100 × 8,000 = ₦1,200.", "Increased amount = 8,000 + 1,200 = ₦9,200."]),
    ],
    devices: [
      "To add or subtract fractions: same denominator first.",
      "To divide by a fraction: multiply by its reciprocal (turn it upside down).",
      "Fraction → percentage: × 100. Percentage → fraction: ÷ 100 and simplify.",
      "Percentage change = change ÷ original × 100.",
      "Profit % = profit ÷ cost price × 100.",
    ],
    classwork: [
      { q: "Work out 1/2 + 1/3.", a: "3/6 + 2/6 = 5/6." },
      { q: "Write 0.6 as a fraction in its simplest form.", a: "6/10 = 3/5." },
      { q: "Find 25% of 360.", a: "25/100 × 360 = 90." },
    ],
    assignment: [
      { q: "Work out 3/5 ÷ 9/10.", a: "3/5 × 10/9 = 30/45 = 2/3." },
      { q: "A trader buys a bag of rice for ₦2,500 and sells it for ₦3,000. Find the percentage profit.", a: "Profit = ₦500. 500/2,500 × 100 = 20%." },
    ],
    quiz: [
      mc("2/5 as a percentage is", "40%", "25%", "20%", "52%"),
      mc("0.07 as a percentage is", "7%", "70%", "0.7%", "700%"),
      mc("1/4 + 1/8 =", "3/8", "2/12", "1/2", "2/8"),
      mc("10% of 450 is", "45", "4.5", "450", "90"),
    ],
  },
  {
    title: "Chapter 2 · Ratio, Rate and Proportion",
    focus: "Comparing quantities, sharing and finding unknown amounts",
    label: "Chapter 2",
    scene: sc(["⚖️", "🚗", "📏"], "#d9f0ff", "#c9e7a5", "Ratio compares two quantities of the same kind."),
    lines: [
      "P|A ratio compares two quantities of the same kind. The ratio of boys to girls, 12 to 18, is written 12 : 18 and simplified to 2 : 3.",
      "H|Sharing in a ratio",
      ex("Share ₦6,000 between Ade and Bisi in the ratio 2 : 3", ["Total parts = 2 + 3 = 5.", "One part = 6,000 ÷ 5 = ₦1,200.", "Ade gets 2 × 1,200 = ₦2,400. Bisi gets 3 × 1,200 = ₦3,600."]),
      "H|Rate and speed",
      "P|A rate compares quantities of different kinds. Speed = distance ÷ time.",
      ex("A car travels 120 km in 2 hours. Find its speed", ["Speed = 120 ÷ 2 = 60 km/h."]),
      "H|Direct and inverse proportion",
      "P|In direct proportion, when one quantity increases the other increases in the same ratio. In inverse proportion, when one increases the other decreases.",
      ex("5 books cost ₦1,500. Find the cost of 8 books", ["One book costs 1,500 ÷ 5 = ₦300.", "8 books cost 8 × 300 = ₦2,400."]),
      ex("4 workers finish a job in 6 days. How long will 3 workers take?", ["Total work = 4 × 6 = 24 worker-days.", "3 workers take 24 ÷ 3 = 8 days."]),
    ],
    devices: [
      "Simplify a ratio by dividing both parts by their highest common factor.",
      "Sharing: add the parts, find one part, then multiply.",
      "Speed = distance ÷ time; distance = speed × time; time = distance ÷ speed.",
      "Direct proportion: find the value of one, then multiply.",
      "Inverse proportion: the product stays the same.",
    ],
    classwork: [
      { q: "Simplify 24 : 36.", a: "Divide by 12: 2 : 3." },
      { q: "Share 100 in the ratio 1 : 4.", a: "One part = 20. The shares are 20 and 80." },
      { q: "Find the speed of a bus that travels 150 km in 3 hours.", a: "150 ÷ 3 = 50 km/h." },
    ],
    assignment: [
      { q: "6 pens cost ₦900. Find the cost of 10 pens.", a: "One pen = ₦150. 10 pens = ₦1,500." },
      { q: "On a map the scale is 1 : 50,000. Two towns are 4 cm apart on the map. Find the real distance in km.", a: "4 × 50,000 = 200,000 cm = 2,000 m = 2 km." },
    ],
    quiz: [
      mc("The ratio 15 : 25 in its simplest form is", "3 : 5", "5 : 3", "15 : 5", "1 : 5"),
      mc("A cyclist travels 36 km in 3 hours. His speed is", "12 km/h", "108 km/h", "33 km/h", "9 km/h"),
      mc("If 3 oranges cost ₦150, 7 oranges cost", "₦350", "₦450", "₦300", "₦250"),
      mc("Share ₦200 in the ratio 3 : 2. The larger share is", "₦120", "₦80", "₦100", "₦150"),
    ],
  },
  {
    title: "Chapter 3 · Algebra: Expressions and Simple Equations",
    focus: "Using letters for numbers and solving for the unknown",
    label: "Chapter 3",
    scene: sc(["🔤", "➕", "🟰"], "#e9d9ff", "#c9e7a5", "A letter stands for a number we do not yet know."),
    lines: [
      "P|In algebra, a letter such as x stands for a number. Like terms (terms with the same letter part) can be added or subtracted: 3x + 2x − x = 4x.",
      "H|Expanding brackets",
      "P|Multiply every term inside the bracket by the term outside: 3(x + 4) = 3x + 12.",
      "H|Solving equations",
      "P|Whatever you do to one side of an equation, you must do to the other side so it stays balanced.",
      ex("Solve 2x + 5 = 17", ["Subtract 5 from both sides: 2x = 12.", "Divide both sides by 2: x = 6.", "Check: 2 × 6 + 5 = 17. Correct."]),
      ex("Solve 3(x − 2) = 15", ["Divide both sides by 3: x − 2 = 5.", "Add 2: x = 7."]),
      "H|Forming equations from words",
      ex("A number is doubled and 7 is added. The result is 25. Find the number", ["Let the number be n. Then 2n + 7 = 25.", "2n = 18, so n = 9."]),
      ex("Substitute a = 3 and b = 2 in 2a² − b", ["2 × 3² − 2 = 2 × 9 − 2 = 18 − 2 = 16."]),
    ],
    devices: [
      "Collect like terms: 4a + 3b − a + 2b = 3a + 5b.",
      "Expand: a(b + c) = ab + ac.",
      "Solve by doing the same to both sides, in reverse order of operations.",
      "Always check your answer by substituting back.",
      "A word problem: choose a letter, write the equation, solve, then answer in words.",
    ],
    classwork: [
      { q: "Solve 5x − 3 = 12.", a: "5x = 15, so x = 3." },
      { q: "Expand 2(3y − 1).", a: "6y − 2." },
      { q: "Simplify 4a + 3b − a + 2b.", a: "3a + 5b." },
    ],
    assignment: [
      { q: "Solve x/4 + 3 = 8.", a: "x/4 = 5, so x = 20." },
      { q: "The length of a rectangle is (x + 3) cm and its width is x cm. Its perimeter is 26 cm. Find x.", a: "2(x + 3 + x) = 26, so 4x + 6 = 26, 4x = 20 and x = 5." },
    ],
    quiz: [
      mc("3x + 2x − x =", "4x", "5x", "6x", "4x²"),
      mc("Expand 3(x + 4).", "3x + 12", "3x + 4", "x + 12", "3x + 7"),
      mc("If 2x + 5 = 17, then x =", "6", "11", "5", "7"),
      mc("If a = 3 and b = 2, then 2a² − b =", "16", "4", "10", "34"),
    ],
  },
  {
    title: "Chapter 4 · Angles and Triangles",
    focus: "Angle facts for straight lines, points, triangles and polygons",
    label: "Chapter 4",
    scene: sc(["📐", "🔺", "📏"], "#d9f0ff", "#c9e7a5", "Set squares and triangles are built on angle facts."),
    diagram: TRIANGLE,
    lines: [
      "P|An angle is measured in degrees (°). A right angle is 90°. Learn these facts, because they appear in every angle problem.",
      "H|Angle facts",
      "R|<ul><li>Angles on a straight line add up to 180°.</li><li>Angles at a point add up to 360°.</li><li>Vertically opposite angles are equal.</li><li>The angles of a triangle add up to 180°.</li><li>The angles of a quadrilateral add up to 360°.</li><li>An exterior angle of a triangle equals the sum of the two opposite interior angles.</li></ul>",
      ex("Find x in the triangle with angles 50°, 65° and x", ["x = 180° − 50° − 65° = 65°."]),
      ex("An isosceles triangle has an apex angle of 40°. Find each base angle", ["The base angles are equal. 180° − 40° = 140°.", "140° ÷ 2 = 70° each."]),
      "H|Polygons",
      "P|The angles inside a polygon with n sides add up to (n − 2) × 180°.",
      ex("Sum of the interior angles of a hexagon (6 sides)", ["(6 − 2) × 180° = 4 × 180° = 720°."]),
    ],
    devices: [
      "Straight line: 180°. Point: 360°. Triangle: 180°. Quadrilateral: 360°.",
      "Isosceles triangle: two equal sides and two equal base angles.",
      "Equilateral triangle: all sides equal and each angle 60°.",
      "Interior angle sum of a polygon: (n − 2) × 180°.",
      "Each interior angle of a regular polygon: (n − 2) × 180° ÷ n.",
    ],
    classwork: [
      { q: "Two angles on a straight line are x and 115°. Find x.", a: "x = 180° − 115° = 65°." },
      { q: "Two angles of a triangle are 90° and 35°. Find the third.", a: "180° − 125° = 55°." },
      { q: "Find the sum of the angles of a pentagon.", a: "(5 − 2) × 180° = 540°." },
    ],
    assignment: [
      { q: "Angles on a straight line are (3x + 20)° and (2x + 10)°. Find x and both angles.", a: "5x + 30 = 180, so x = 30. The angles are 110° and 70°." },
      { q: "Find each interior angle of a regular hexagon.", a: "720° ÷ 6 = 120°." },
    ],
    quiz: [
      mc("The angles of a triangle add up to", "180°", "90°", "360°", "270°"),
      mc("Angles at a point add up to", "360°", "180°", "90°", "720°"),
      mc("Each angle of an equilateral triangle is", "60°", "45°", "90°", "30°"),
      mc("The interior angles of a quadrilateral add up to", "360°", "180°", "540°", "720°"),
    ],
  },
  {
    title: "Chapter 5 · Perimeter and Area",
    focus: "Measuring the edge and the surface of flat shapes",
    label: "Chapter 5",
    scene: sc(["🌾", "📏", "⭕"], "#ffe7b3", "#a5d08a", "Fencing a farm needs the perimeter; planting it needs the area."),
    diagram: AREAS,
    lines: [
      "P|The perimeter is the distance around a shape. The area is the amount of surface it covers, measured in square units such as cm² or m².",
      "R|<table><thead><tr><th>Shape</th><th>Perimeter</th><th>Area</th></tr></thead><tbody><tr><td>Rectangle</td><td>2(l + w)</td><td>l × w</td></tr><tr><td>Square</td><td>4s</td><td>s²</td></tr><tr><td>Triangle</td><td>sum of sides</td><td>½ × b × h</td></tr><tr><td>Trapezium</td><td>sum of sides</td><td>½(a + b) × h</td></tr><tr><td>Circle</td><td>2πr (circumference)</td><td>πr²</td></tr></tbody></table>",
      ex("A rectangle is 12 cm long and 7 cm wide. Find its perimeter and area", ["Perimeter = 2(12 + 7) = 38 cm.", "Area = 12 × 7 = 84 cm²."]),
      ex("A triangle has base 10 cm and height 6 cm. Find its area", ["Area = ½ × 10 × 6 = 30 cm²."]),
      ex("A circle has radius 7 cm. Use π = 22/7", ["Circumference = 2 × 22/7 × 7 = 44 cm.", "Area = 22/7 × 7 × 7 = 154 cm²."]),
      ex("A trapezium has parallel sides 8 cm and 12 cm and height 5 cm", ["Area = ½ × (8 + 12) × 5 = ½ × 20 × 5 = 50 cm²."]),
    ],
    devices: [
      "Perimeter is a length (cm, m); area is in square units (cm², m²).",
      "The height of a triangle is measured at a right angle to the base.",
      "Diameter = 2 × radius.",
      "For a composite shape, split it into simple shapes, find each area and add (or subtract).",
      "Use π = 22/7 or 3.14 as the question says.",
    ],
    classwork: [
      { q: "A square has side 9 cm. Find its perimeter and area.", a: "Perimeter = 36 cm. Area = 81 cm²." },
      { q: "A triangle has base 8 cm and height 5 cm. Find its area.", a: "½ × 8 × 5 = 20 cm²." },
      { q: "Find the circumference of a circle of radius 14 cm (π = 22/7).", a: "2 × 22/7 × 14 = 88 cm." },
    ],
    assignment: [
      { q: "A field is 40 m long and 25 m wide. It is fenced with 3 rounds of wire. Find the length of wire used.", a: "Perimeter = 2(40 + 25) = 130 m. Three rounds = 390 m." },
      { q: "A circular table has diameter 20 cm. Find its area (π = 22/7), correct to 1 decimal place.", a: "Radius = 10 cm. Area = 22/7 × 100 = 314.3 cm²." },
    ],
    quiz: [
      mc("The area of a rectangle 8 cm by 5 cm is", "40 cm²", "26 cm²", "13 cm²", "40 cm"),
      mc("The area of a triangle is", "½ × base × height", "base × height", "base + height", "2 × base × height"),
      mc("The circumference of a circle is", "2πr", "πr²", "πr", "2r"),
      mc("The perimeter of a square of side 6 cm is", "24 cm", "36 cm", "12 cm", "18 cm"),
    ],
  },
  {
    title: "Chapter 6 · Statistics: Mean, Median and Mode",
    focus: "Collecting data and finding the typical value",
    label: "Chapter 6",
    scene: sc(["📊", "📝", "🧮"], "#e9d9ff", "#c9e7a5", "A bar chart turns numbers into pictures."),
    diagram: barChart("Marks scored by 8 pupils", [["A", 3], ["B", 4], ["C", 5], ["D", 7], ["E", 7], ["F", 7], ["G", 9], ["H", 10]], 10),
    lines: [
      "P|Statistics is the study of data. Three averages describe the middle or typical value of a set of numbers.",
      "R|<ul><li><b>Mean</b> = sum of all values ÷ number of values.</li><li><b>Median</b> = the middle value when the data are arranged in order (if there are two middle values, take their mean).</li><li><b>Mode</b> = the value that occurs most often.</li><li><b>Range</b> = largest value − smallest value.</li></ul>",
      ex("Find the mean, median, mode and range of 4, 7, 7, 9, 3, 7, 10, 5", ["Arrange in order: 3, 4, 5, 7, 7, 7, 9, 10.", "Sum = 52 and there are 8 values, so mean = 52 ÷ 8 = 6.5.", "The 4th and 5th values are 7 and 7, so median = 7.", "The value 7 occurs three times, so mode = 7.", "Range = 10 − 3 = 7."]),
      "H|Frequency tables",
      ex("Scores 1, 2, 3 occur 2, 3 and 5 times. Find the mean score", ["Total frequency = 2 + 3 + 5 = 10.", "Sum of (score × frequency) = 2 + 6 + 15 = 23.", "Mean = 23 ÷ 10 = 2.3."]),
    ],
    devices: [
      "Always arrange the data in order before finding the median.",
      "A set of data can have more than one mode, or none.",
      "Mean from a frequency table = sum of (value × frequency) ÷ sum of frequencies.",
      "Bar charts compare separate groups; pie charts show parts of a whole.",
      "In a pie chart, the angle of a sector = frequency ÷ total × 360°.",
    ],
    classwork: [
      { q: "Find the mean and median of 2, 4, 6, 8, 10.", a: "Mean = 30 ÷ 5 = 6. Median = 6." },
      { q: "Find the mode of 3, 5, 5, 8, 5, 9.", a: "5." },
      { q: "Find the range of 12, 5, 20, 9.", a: "20 − 5 = 15." },
    ],
    assignment: [
      { q: "The mean of five numbers is 8. A sixth number, 14, is added. Find the new mean.", a: "Total of five = 40. New total = 54. New mean = 54 ÷ 6 = 9." },
      { q: "In a class of 36, 9 pupils like football. What angle represents football in a pie chart?", a: "9 ÷ 36 × 360° = 90°." },
    ],
    quiz: [
      mc("The mean of 4, 6 and 8 is", "6", "18", "5", "8"),
      mc("The mode of 2, 3, 3, 4, 5 is", "3", "2", "4", "5"),
      mc("The median of 3, 9, 5, 7, 1 is", "5", "9", "1", "4"),
      mc("The range of 7, 15, 3, 10 is", "12", "15", "8", "10"),
    ],
  },
];

export const MATHS_JSS: PoeticWork = {
  kind: "EBOOK",
  notesTitle: "Key points and formulae",
  source: "FODAN Mathematics Textbook JSS1-JSS3",
  title: "FODAN Mathematics · JSS1–JSS3",
  subtitle: "Thirteen chapters grouped by class (JSS1, JSS2, JSS3), following the NERDC Basic Mathematics curriculum, with worked examples, diagrams, exercises and CBT",
  introHtml: `<h2>How to use this textbook</h2><p>This textbook covers the key topics of the NERDC Basic Mathematics curriculum for Junior Secondary School, class by class. JSS1: whole numbers and number bases, fractions, decimals and percentages, ratio and proportion, perimeter and area. JSS2: algebra, angles and triangles, simultaneous equations and graphs, approximation and standard form, statistics. JSS3: factorisation, Pythagoras and solids, constructions and bearings, probability.</p><ul><li>Read the explanation, then study each <b>Worked example</b> with a pencil in your hand.</li><li>Do the <b>Classwork</b>, then the <b>Assignment</b>. Model answers show the working, so compare your steps and not only your answer.</li><li>Finish each chapter with the CBT quiz, and the Term Review at the end of the book.</li></ul><p><b>Tip:</b> in Mathematics you learn by doing. Try each question before you read the answer.</p>`,
  units: byClass([
    ["JSS1", [JSS_EXTRA.bases, jssUnits[0], jssUnits[1], jssUnits[4]]],
    ["JSS2", [jssUnits[2], jssUnits[3], JSS_EXTRA.simul, JSS_EXTRA.approx, jssUnits[5]]],
    ["JSS3", [JSS_EXTRA.factor, JSS_EXTRA.pyth, JSS_EXTRA.construct, JSS_EXTRA.prob]],
  ]),
  review: [
    mc("2/5 + 1/5 =", "3/5", "3/10", "2/25", "1/5"),
    mc("Share ₦400 in the ratio 1 : 3. The smaller share is", "₦100", "₦300", "₦133", "₦200"),
    mc("Solve 3x + 4 = 19.", "x = 5", "x = 7", "x = 3", "x = 15"),
    mc("The angles of a triangle add up to", "180°", "360°", "90°", "270°"),
    mc("The area of a rectangle 9 cm by 4 cm is", "36 cm²", "26 cm²", "13 cm²", "36 cm"),
    mc("The mean of 5, 7, 9, 11 is", "8", "32", "7", "9"),
    mc("20% of ₦5,000 is", "₦1,000", "₦100", "₦2,000", "₦250"),
    mc("A car travels 240 km in 4 hours. Its speed is", "60 km/h", "960 km/h", "40 km/h", "244 km/h"),
  ],
};

/* ============================================================================================ SSS */

const sssUnits: PoeticUnit[] = [
  {
    title: "Chapter 1 · Indices and Logarithms",
    focus: "Powers, roots and their inverse, the logarithm",
    label: "Chapter 1",
    scene: sc(["🔢", "⚡", "📈"], "#ffe7b3", "#c9e7a5", "Small numbers written as powers grow very fast."),
    lines: [
      "P|An index (power) tells how many times a number is multiplied by itself: 2⁴ = 2 × 2 × 2 × 2 = 16. A logarithm is the inverse: log₂ 16 = 4 because 2⁴ = 16.",
      "H|Laws of indices",
      "R|<ul><li>aᵐ × aⁿ = aᵐ⁺ⁿ</li><li>aᵐ ÷ aⁿ = aᵐ⁻ⁿ</li><li>(aᵐ)ⁿ = aᵐⁿ</li><li>a⁰ = 1</li><li>a⁻ⁿ = 1/aⁿ</li><li>a^(1/n) = the nth root of a</li></ul>",
      ex("Evaluate 2³ × 2⁴ and 8^(2/3)", ["2³ × 2⁴ = 2⁷ = 128.", "8^(2/3) = (cube root of 8)² = 2² = 4."]),
      ex("Evaluate 2⁻³ and (3²)³", ["2⁻³ = 1/2³ = 1/8.", "(3²)³ = 3⁶ = 729."]),
      "H|Logarithms",
      "P|If aˣ = N then logₐ N = x. Laws: log(ab) = log a + log b; log(a/b) = log a − log b; log aⁿ = n log a.",
      ex("Evaluate log₂ 8, log₃ 81 and log 4 + log 25 (base 10)", ["2³ = 8, so log₂ 8 = 3.", "3⁴ = 81, so log₃ 81 = 4.", "log 4 + log 25 = log 100 = 2."]),
      ex("Solve 2ˣ = 32", ["32 = 2⁵, so 2ˣ = 2⁵ and x = 5."]),
    ],
    devices: [
      "Same base: add the powers when multiplying, subtract when dividing.",
      "Any non-zero number to the power 0 is 1.",
      "A negative power means the reciprocal.",
      "log₁₀ 10 = 1, log₁₀ 100 = 2, log₁₀ 1 = 0.",
      "To solve aˣ = b, write both sides with the same base or take logarithms.",
    ],
    classwork: [
      { q: "Simplify 5⁰ + 3².", a: "1 + 9 = 10." },
      { q: "Evaluate log₁₀ 1000.", a: "3." },
      { q: "Evaluate log 2 + log 5.", a: "log 10 = 1." },
    ],
    assignment: [
      { q: "Solve 3ˣ = 81.", a: "81 = 3⁴, so x = 4." },
      { q: "Evaluate 27^(2/3) ÷ 2⁻².", a: "27^(2/3) = 3² = 9 and 2⁻² = 1/4. 9 ÷ 1/4 = 36." },
    ],
    quiz: [
      mc("2³ × 2² =", "2⁵", "2⁶", "4⁵", "2¹"),
      mc("4^(1/2) =", "2", "8", "16", "1/2"),
      mc("log₂ 16 =", "4", "8", "2", "16"),
      mc("5⁻¹ =", "1/5", "−5", "5", "−1/5"),
    ],
  },
  {
    title: "Chapter 2 · Quadratic Equations",
    focus: "Solving ax² + bx + c = 0 by factorising and by formula",
    label: "Chapter 2",
    scene: sc(["🏹", "📉", "🎯"], "#d9f0ff", "#c9e7a5", "A thrown ball follows the curve of a quadratic."),
    diagram: PARABOLA,
    lines: [
      "P|A quadratic equation has the form ax² + bx + c = 0 (a ≠ 0). It has up to two solutions, called roots. Their graph is a curve called a parabola, and the roots are where it crosses the x-axis.",
      "H|Method 1: factorising",
      ex("Solve x² − 5x + 6 = 0", ["Find two numbers that multiply to 6 and add to −5: −2 and −3.", "(x − 2)(x − 3) = 0.", "So x = 2 or x = 3."]),
      ex("Solve x² + 2x − 15 = 0", ["Numbers that multiply to −15 and add to 2: 5 and −3.", "(x + 5)(x − 3) = 0.", "So x = −5 or x = 3."]),
      "H|Method 2: the formula",
      "P|For ax² + bx + c = 0: x = (−b ± √(b² − 4ac)) ÷ 2a. The part b² − 4ac is the discriminant: if it is positive there are two roots, if zero one root, if negative none.",
      ex("Solve 2x² + 3x − 2 = 0", ["a = 2, b = 3, c = −2.", "b² − 4ac = 9 + 16 = 25 and √25 = 5.", "x = (−3 ± 5) ÷ 4, so x = 2/4 = 1/2 or x = −8/4 = −2."]),
      "H|Forming a quadratic from a problem",
      ex("The length of a rectangle is (x + 3) m and its width is x m. Its area is 40 m². Find x", ["x(x + 3) = 40, so x² + 3x − 40 = 0.", "(x + 8)(x − 5) = 0, so x = −8 or x = 5.", "A length cannot be negative, so x = 5 m."]),
    ],
    devices: [
      "Sum of the roots = −b ÷ a. Product of the roots = c ÷ a.",
      "Always move every term to one side so the other side is 0 before factorising.",
      "Check each root by substituting back.",
      "A negative root may have to be rejected in a real-life problem.",
      "Discriminant b² − 4ac decides the number of real roots.",
    ],
    classwork: [
      { q: "Solve x² − 9 = 0.", a: "(x − 3)(x + 3) = 0, so x = 3 or x = −3." },
      { q: "Solve x² + 7x + 12 = 0.", a: "(x + 3)(x + 4) = 0, so x = −3 or x = −4." },
      { q: "Find the discriminant of x² + 2x + 5.", a: "4 − 20 = −16, which is negative, so there are no real roots." },
    ],
    assignment: [
      { q: "Solve 3x² − 5x − 2 = 0 by the formula.", a: "b² − 4ac = 25 + 24 = 49. x = (5 ± 7) ÷ 6, so x = 2 or x = −1/3." },
      { q: "Two consecutive positive integers have a product of 56. Find them.", a: "x(x + 1) = 56, so x² + x − 56 = 0, (x + 8)(x − 7) = 0. x = 7, and the numbers are 7 and 8." },
    ],
    quiz: [
      mc("The roots of (x − 1)(x − 4) = 0 are", "1 and 4", "−1 and −4", "1 and −4", "4 and −1"),
      mc("The roots of x² − 25 = 0 are", "5 and −5", "25 only", "5 only", "0 and 25"),
      mc("The discriminant of ax² + bx + c is", "b² − 4ac", "b² + 4ac", "4ac − b", "−b ÷ 2a"),
      mc("The graph of a quadratic is called a", "parabola", "circle", "straight line", "hyperbola"),
    ],
  },
  {
    title: "Chapter 3 · Sequences and Series",
    focus: "Arithmetic and geometric progressions",
    label: "Chapter 3",
    scene: sc(["🪜", "🔢", "➗"], "#ffe7b3", "#c9e7a5", "Each step of a ladder rises by the same amount."),
    lines: [
      "P|A sequence is a list of numbers in a pattern. A series is the sum of the terms.",
      "H|Arithmetic Progression (AP): a constant difference d",
      "R|<ul><li>nth term: Tₙ = a + (n − 1)d</li><li>Sum of n terms: Sₙ = n/2 × [2a + (n − 1)d]</li></ul>",
      ex("For the AP 3, 7, 11, … find the 10th term and the sum of 10 terms", ["a = 3 and d = 4.", "T₁₀ = 3 + 9 × 4 = 39.", "S₁₀ = 10/2 × (2 × 3 + 9 × 4) = 5 × 42 = 210."]),
      "H|Geometric Progression (GP): a constant ratio r",
      "R|<ul><li>nth term: Tₙ = a × rⁿ⁻¹</li><li>Sum of n terms: Sₙ = a(rⁿ − 1) ÷ (r − 1)</li><li>Sum to infinity (if −1 &lt; r &lt; 1): S∞ = a ÷ (1 − r)</li></ul>",
      ex("For the GP 2, 6, 18, … find the 5th term and the sum of 4 terms", ["a = 2 and r = 3.", "T₅ = 2 × 3⁴ = 162.", "S₄ = 2 × (3⁴ − 1) ÷ 2 = 80. Check: 2 + 6 + 18 + 54 = 80."]),
      ex("Find the sum to infinity of 1 + 1/2 + 1/4 + …", ["a = 1 and r = 1/2.", "S∞ = 1 ÷ (1 − 1/2) = 2."]),
    ],
    devices: [
      "AP: add the same number each time. GP: multiply by the same number each time.",
      "To find d: second term − first term. To find r: second term ÷ first term.",
      "The sum of the first n natural numbers is n(n + 1) ÷ 2.",
      "A GP has a sum to infinity only when r is between −1 and 1.",
      "Use two given terms to form two equations in a and d (or a and r).",
    ],
    classwork: [
      { q: "Find the 8th term of the AP 5, 8, 11, …", a: "a = 5, d = 3. T₈ = 5 + 7 × 3 = 26." },
      { q: "Find the 6th term of the GP 3, 6, 12, …", a: "r = 2. T₆ = 3 × 2⁵ = 96." },
      { q: "Find the sum of the first 20 natural numbers.", a: "20 × 21 ÷ 2 = 210." },
    ],
    assignment: [
      { q: "The 3rd term of an AP is 11 and the 7th term is 23. Find a, d and the 20th term.", a: "4d = 23 − 11 = 12, so d = 3. a = 11 − 6 = 5. T₂₀ = 5 + 19 × 3 = 62." },
      { q: "The 2nd term of a GP is 6 and the 5th term is 48. Find r and a.", a: "r³ = 48 ÷ 6 = 8, so r = 2. a = 6 ÷ 2 = 3." },
    ],
    quiz: [
      mc("The common difference of 4, 9, 14, … is", "5", "4", "9", "14"),
      mc("The 10th term of 2, 4, 8, … is", "1024", "20", "512", "100"),
      mc("The sum to infinity of 4 + 2 + 1 + … is", "8", "7", "16", "4"),
      mc("The nth term of an AP is", "a + (n − 1)d", "a × rⁿ⁻¹", "n/2 (a + d)", "a + nd²"),
    ],
  },
  {
    title: "Chapter 4 · Trigonometry",
    focus: "Sine, cosine and tangent in right-angled triangles",
    label: "Chapter 4",
    scene: sc(["🗼", "📐", "☀️"], "#cfe8ff", "#c9e7a5", "The height of a tower can be found from an angle and a distance."),
    diagram: RIGHT_TRIANGLE,
    lines: [
      "P|In a right-angled triangle, the ratios of the sides depend only on the angle θ. Remember them as SOH CAH TOA: Sine = Opposite ÷ Hypotenuse, Cosine = Adjacent ÷ Hypotenuse, Tangent = Opposite ÷ Adjacent.",
      "R|<table><thead><tr><th>Angle</th><th>30°</th><th>45°</th><th>60°</th></tr></thead><tbody><tr><td>sin</td><td>1/2</td><td>√2/2</td><td>√3/2</td></tr><tr><td>cos</td><td>√3/2</td><td>√2/2</td><td>1/2</td></tr><tr><td>tan</td><td>√3/3</td><td>1</td><td>√3</td></tr></tbody></table>",
      ex("A right-angled triangle has sides 3, 4 and 5. Find sin θ, cos θ and tan θ for the angle opposite the side 3", ["The hypotenuse is 5 (the longest side).", "sin θ = 3/5, cos θ = 4/5, tan θ = 3/4."]),
      ex("A ladder 10 m long leans against a wall at 60° to the ground. How high does it reach?", ["Height is the opposite side and the ladder is the hypotenuse.", "sin 60° = height ÷ 10.", "Height = 10 × √3/2 = 5√3 ≈ 8.66 m."]),
      ex("From a point 50 m from the foot of a tower, the angle of elevation of the top is 45°. Find the height", ["tan 45° = height ÷ 50 and tan 45° = 1.", "Height = 50 m."]),
      "H|Pythagoras' theorem",
      "P|In a right-angled triangle, a² + b² = c², where c is the hypotenuse. For example 5² + 12² = 25 + 144 = 169 = 13².",
    ],
    devices: [
      "SOH CAH TOA: identify the opposite, adjacent and hypotenuse from the angle you are using.",
      "The hypotenuse is always opposite the right angle and is the longest side.",
      "Angle of elevation: measured upward from the horizontal. Angle of depression: measured downward from the horizontal.",
      "Set your calculator to degrees.",
      "sin²θ + cos²θ = 1.",
    ],
    classwork: [
      { q: "Write the value of sin 30°.", a: "1/2." },
      { q: "A right-angled triangle has hypotenuse 13 and opposite side 5. Find sin θ.", a: "5/13." },
      { q: "Find the hypotenuse of a right-angled triangle with sides 6 and 8.", a: "√(36 + 64) = √100 = 10." },
    ],
    assignment: [
      { q: "A tree casts a shadow of 20 m when the angle of elevation of the sun is 45°. Find the height of the tree.", a: "tan 45° = height ÷ 20, so height = 20 m." },
      { q: "A right-angled triangle has adjacent side 8 and hypotenuse 17. Find the opposite side and sin θ.", a: "Opposite = √(17² − 8²) = √(289 − 64) = √225 = 15. sin θ = 15/17." },
    ],
    quiz: [
      mc("tan θ =", "opposite ÷ adjacent", "adjacent ÷ opposite", "opposite ÷ hypotenuse", "adjacent ÷ hypotenuse"),
      mc("cos 60° =", "1/2", "√3/2", "1", "√2/2"),
      mc("In a right-angled triangle with sides 5, 12 and 13, the hypotenuse is", "13", "12", "5", "17"),
      mc("sin 30° equals", "1/2", "√3/2", "1", "0"),
    ],
  },
  {
    title: "Chapter 5 · Probability",
    focus: "Measuring chance, from 0 (impossible) to 1 (certain)",
    label: "Chapter 5",
    scene: sc(["🎲", "🪙", "🎴"], "#ffe7b3", "#c9e7a5", "A fair die has six equally likely outcomes."),
    lines: [
      "P|Probability measures how likely an event is. P(E) = number of favourable outcomes ÷ total number of equally likely outcomes. It is always between 0 and 1.",
      ex("A fair die is thrown. Find P(even number) and P(prime number)", ["The outcomes are 1, 2, 3, 4, 5, 6: six outcomes.", "Even numbers are 2, 4, 6, so P(even) = 3/6 = 1/2.", "Prime numbers are 2, 3, 5, so P(prime) = 3/6 = 1/2."]),
      ex("Two coins are tossed. Find P(two heads)", ["The outcomes are HH, HT, TH, TT.", "P(HH) = 1/4."]),
      "H|Rules of probability",
      "R|<ul><li>P(not E) = 1 − P(E).</li><li>If A and B are mutually exclusive (cannot both happen): P(A or B) = P(A) + P(B).</li><li>If A and B are independent: P(A and B) = P(A) × P(B).</li></ul>",
      ex("A bag has 3 red and 5 blue balls. Two balls are taken without replacement. Find P(both red)", ["P(first red) = 3/8.", "Now 2 red remain among 7 balls: P(second red) = 2/7.", "P(both red) = 3/8 × 2/7 = 6/56 = 3/28."]),
    ],
    devices: [
      "Probability 0 means impossible; 1 means certain.",
      "'Without replacement' changes the total for the next draw.",
      "Use a tree diagram or a table of outcomes to list all possibilities.",
      "Sum of the probabilities of all outcomes = 1.",
      "Express probabilities as fractions in simplest form unless asked for decimals.",
    ],
    classwork: [
      { q: "A card is drawn from a pack of 52. Find P(ace).", a: "4/52 = 1/13." },
      { q: "Find P(a sum of 7) when two dice are thrown.", a: "The sum 7 can happen in 6 ways out of 36, so 6/36 = 1/6." },
      { q: "P(rain) = 0.3. Find P(no rain).", a: "1 − 0.3 = 0.7." },
    ],
    assignment: [
      { q: "A bag has 4 green and 6 yellow balls. Two are drawn without replacement. Find P(green then yellow).", a: "4/10 × 6/9 = 24/90 = 4/15." },
      { q: "Two dice are thrown. Find the probability that the sum is 12.", a: "Only (6, 6): 1/36." },
    ],
    quiz: [
      mc("The probability of an impossible event is", "0", "1", "0.5", "−1"),
      mc("P(head) for a fair coin is", "1/2", "1", "1/4", "2"),
      mc("A bag has 2 red and 3 blue balls. P(red) =", "2/5", "3/5", "2/3", "1/2"),
      mc("If P(E) = 0.8, then P(not E) =", "0.2", "0.8", "1.8", "0.4"),
    ],
  },
  {
    title: "Chapter 6 · Introduction to Differentiation",
    focus: "The gradient of a curve and its uses",
    label: "Chapter 6",
    scene: sc(["📈", "🏃", "⛰️"], "#e9d9ff", "#c9e7a5", "The gradient of a curve tells how fast something is changing."),
    lines: [
      "P|Differentiation finds the rate of change of one quantity with respect to another. It also gives the gradient (slope) of a curve at any point.",
      "H|The power rule",
      "R|<ul><li>If y = axⁿ, then dy/dx = a × n × xⁿ⁻¹.</li><li>The derivative of a constant is 0.</li><li>Differentiate term by term.</li></ul>",
      ex("Differentiate y = 3x² + 5x − 2 and find the gradient at x = 2", ["dy/dx = 6x + 5.", "At x = 2: 6 × 2 + 5 = 17."]),
      ex("Differentiate y = x³ − 6x", ["dy/dx = 3x² − 6."]),
      "H|Turning points",
      "P|At a maximum or minimum point, the gradient is zero. Set dy/dx = 0 and solve.",
      ex("Find the turning point of y = x² − 4x + 1", ["dy/dx = 2x − 4 = 0, so x = 2.", "y = 4 − 8 + 1 = −3.", "The turning point is (2, −3). It is a minimum because the curve opens upward."]),
      "H|Rates of change",
      ex("A particle moves so that s = t³ − 3t² metres after t seconds. Find its velocity when t = 3", ["Velocity v = ds/dt = 3t² − 6t.", "At t = 3: 27 − 18 = 9 m/s."]),
    ],
    devices: [
      "Power rule: bring the power down, then reduce the power by 1.",
      "The derivative of a constant is zero; of ax is a.",
      "Gradient of a curve at a point = value of dy/dx there.",
      "Turning points occur where dy/dx = 0.",
      "Velocity is the derivative of distance with respect to time; acceleration is the derivative of velocity.",
    ],
    classwork: [
      { q: "Differentiate 5x⁴.", a: "20x³." },
      { q: "Differentiate 7x + 10.", a: "7." },
      { q: "Find the gradient of y = x² at x = 3.", a: "dy/dx = 2x = 6." },
    ],
    assignment: [
      { q: "Find the turning points of y = 2x³ − 9x² + 12x.", a: "dy/dx = 6x² − 18x + 12 = 6(x − 1)(x − 2) = 0, so x = 1 or 2. y(1) = 2 − 9 + 12 = 5 and y(2) = 16 − 36 + 24 = 4. The points are (1, 5) and (2, 4)." },
      { q: "A body moves with s = 4t² + t metres. Find its velocity when t = 2 s.", a: "v = 8t + 1 = 17 m/s." },
    ],
    quiz: [
      mc("d/dx (x³) =", "3x²", "x²", "3x", "x⁴ ÷ 4"),
      mc("The derivative of a constant is", "0", "1", "the constant", "x"),
      mc("At a turning point, dy/dx is", "0", "1", "infinite", "negative"),
      mc("d/dx (4x² + 3x) =", "8x + 3", "8x", "4x + 3", "8x² + 3"),
    ],
  },
];

export const MATHS_SSS: PoeticWork = {
  kind: "EBOOK",
  notesTitle: "Key points and formulae",
  source: "FODAN Mathematics Textbook SSS1-SSS3",
  title: "FODAN Mathematics · SSS1–SSS3",
  subtitle: "Fifteen chapters grouped by class (SSS1, SSS2, SSS3) for senior secondary and WAEC, NECO and JAMB preparation, with worked examples, diagrams, exercises and CBT",
  introHtml: `<h2>How to use this textbook</h2><p>This textbook covers core topics of the NERDC Senior Secondary Mathematics curriculum, class by class, that appear again and again in WAEC, NECO and JAMB. SSS1: number bases, indices and logarithms, sets, quadratic equations. SSS2: variation, sequences and series, circle geometry, statistics, trigonometry, coordinate geometry. SSS3: mensuration, matrices, probability, differentiation and integration.</p><ul><li>Study each <b>Worked example</b> line by line, then cover it and redo it.</li><li>Do the <b>Classwork</b> and <b>Assignment</b>. Compare your working, not just your answer, with the model answer.</li><li>Take the chapter CBT, then the Term Review at the end.</li></ul><p><b>Tip:</b> write every formula on a card and revise it daily. Speed in examinations comes from knowing formulae by heart.</p>`,
  units: byClass([
    ["SSS1", [SSS_EXTRA.bases, sssUnits[0], SSS_EXTRA.sets, sssUnits[1]]],
    ["SSS2", [SSS_EXTRA.variation, sssUnits[2], SSS_EXTRA.circles, SSS_EXTRA.stats, sssUnits[3], SSS_EXTRA.coords]],
    ["SSS3", [SSS_EXTRA.mensuration, SSS_EXTRA.matrices, sssUnits[4], sssUnits[5], SSS_EXTRA.integration]],
  ]),
  review: [
    mc("2⁵ ÷ 2² =", "8", "2", "32", "4"),
    mc("log₁₀ 100 =", "2", "10", "1", "100"),
    mc("The roots of x² − 7x + 10 = 0 are", "2 and 5", "−2 and −5", "1 and 10", "−2 and 5"),
    mc("The 10th term of the AP 3, 7, 11, … is", "39", "43", "40", "37"),
    mc("tan 45° =", "1", "0", "1/2", "√3"),
    mc("The probability of a certain event is", "1", "0", "0.5", "100"),
    mc("d/dx (5x²) =", "10x", "5x", "10x²", "5"),
    mc("The sum to infinity of a GP with a = 6 and r = 1/3 is", "9", "18", "2", "6"),
  ],
};
