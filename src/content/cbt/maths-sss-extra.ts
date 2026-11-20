/** Additional FODAN Mathematics chapters for SSS1–SSS3. Every worked answer has been checked by hand. */

import type { PoeticUnit } from "./poetic-types";
import { mc, sc, ex, fig, t, table } from "./book-kit";

const VENN = fig(
  "Venn diagram: 40 students, 25 like Maths (M), 20 like English (E), 8 like neither",
  `<rect x="10" y="10" width="300" height="130" rx="10" fill="#fff" stroke="#64748b" stroke-width="1.5"/><circle cx="125" cy="75" r="50" fill="#bfdbfe" fill-opacity="0.7" stroke="#1d4ed8" stroke-width="2"/><circle cx="195" cy="75" r="50" fill="#fecaca" fill-opacity="0.7" stroke="#dc2626" stroke-width="2"/>${t(100, 78, "12", 15)}${t(160, 78, "13", 15)}${t(220, 78, "7", 15)}${t(30, 128, "8", 15)}${t(100, 28, "M", 13, "middle", "#1d4ed8")}${t(220, 28, "E", 13, "middle", "#dc2626")}${t(290, 128, "ξ = 40", 11, "end", "#64748b", 600)}`,
  150,
);
const hyper = (() => {
  const pts = [1, 1.5, 2, 3, 4, 6, 8].map((x) => `${40 + x * 30},${120 - 4 * (24 / x)}`).join(" ");
  return fig(
    "Direct variation is a straight line through the origin; inverse variation is a curve",
    `<line x1="40" y1="120" x2="300" y2="120" stroke="#94a3b8" stroke-width="1.5"/><line x1="40" y1="10" x2="40" y2="120" stroke="#94a3b8" stroke-width="1.5"/><polyline points="${pts}" fill="none" stroke="#dc2626" stroke-width="2.5"/><line x1="40" y1="120" x2="200" y2="40" stroke="#1d4ed8" stroke-width="2.5"/>${t(215, 42, "y = kx (direct)", 10, "start", "#1d4ed8")}${t(250, 100, "y = k/x (inverse)", 10, "middle", "#dc2626")}${t(170, 140, "x", 11)}${t(28, 20, "y", 11)}`,
    150,
  );
})();
const CIRCLE = fig(
  "The angle at the centre is twice the angle at the circumference: ∠AOB = 2 × ∠APB",
  `<circle cx="160" cy="80" r="55" fill="#eef2ff" stroke="#4338ca" stroke-width="2"/><polyline points="112,107 160,25 208,107" fill="none" stroke="#be185d" stroke-width="2"/><polyline points="112,107 160,80 208,107" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>${t(104, 118, "A")}${t(216, 118, "B")}${t(160, 18, "P")}${t(160, 96, "O", 12)}${t(160, 54, "35°", 10, "middle", "#be185d")}${t(160, 122, "70°", 11, "middle", "#1d4ed8")}${t(290, 85, "∠AOB = 70°", 10, "end", "#64748b", 600)}`,
  150,
);
const SECTOR = fig(
  "A sector of angle θ in a circle of radius r",
  `<path d="M120,115 L200,115 A80,80 0 0 0 176.6,58.4 Z" fill="#fde68a" stroke="#b45309" stroke-width="2.5" transform="translate(-20,0)"/>${t(125, 108, "θ = 90°", 11)}${t(135, 134, "r = 14 cm", 11)}${t(255, 60, "Arc = θ/360 × 2πr", 11, "middle", "#b45309")}${t(255, 82, "Area = θ/360 × πr²", 11, "middle", "#b45309")}`,
  145,
);
const HIST = fig(
  "Frequency histogram of marks: the tallest bar shows the modal class",
  `<line x1="30" y1="120" x2="300" y2="120" stroke="#64748b" stroke-width="2"/><rect x="50" y="88" width="48" height="32" fill="#93c5fd" stroke="#1d4ed8"/><rect x="98" y="62" width="48" height="58" fill="#93c5fd" stroke="#1d4ed8"/><rect x="146" y="28" width="48" height="92" fill="#fbbf24" stroke="#b45309"/><rect x="194" y="76" width="48" height="44" fill="#93c5fd" stroke="#1d4ed8"/><rect x="242" y="104" width="48" height="16" fill="#93c5fd" stroke="#1d4ed8"/>${t(74, 134, "0–9", 10)}${t(122, 134, "10–19", 10)}${t(170, 134, "20–29", 10)}${t(218, 134, "30–39", 10)}${t(266, 134, "40–49", 10)}${t(170, 22, "modal class", 10, "middle", "#b45309")}`,
  150,
);

export const SSS_EXTRA: Record<"bases" | "sets" | "variation" | "circles" | "stats" | "mensuration" | "matrices" | "coords" | "integration", PoeticUnit> = {
  bases: {
    title: "Chapter 1 · Number Bases",
    focus: "Changing between bases and doing arithmetic in any base",
    label: "Chapter 1",
    scene: sc(["💻", "🔢", "🧮"], "#e9e0ff", "#c9e7a5", "Computers store everything as 0s and 1s."),
    lines: [
      "P|In base n, the places from the right are worth 1, n, n², n³ and so on, and only the digits 0 to n − 1 are used. In base eight, for example, the digits are 0 to 7 and the places are 1, 8, 64.",
      ex("Change 234 in base five to base eight", ["First to base ten: 2 × 25 + 3 × 5 + 4 = 50 + 15 + 4 = 69.", "Now divide 69 by 8: 69 ÷ 8 = 8 remainder 5.", "8 ÷ 8 = 1 remainder 0, then 1 ÷ 8 = 0 remainder 1.", "Reading upwards: 105 in base eight. Check: 64 + 0 + 5 = 69."]),
      "H|Arithmetic in other bases",
      ex("Subtract 101 from 1101 in base two", ["1101 in base two is 13 and 101 is 5.", "13 − 5 = 8, and 8 in base two is 1000.", "Answer: 1000 in base two."]),
      ex("Multiply 23 by 4 in base five", ["Work from the right: 3 × 4 = 12 = 2 × 5 + 2, so write 2 and carry 2.", "2 × 4 = 8, plus the carry 2 is 10 = 2 × 5 + 0, so write 0 and carry 2.", "Write the last carry 2. The answer is 202 in base five.", "Check: 23 in base five is 13, 13 × 4 = 52, and 202 in base five is 50 + 0 + 2 = 52."]),
      "H|Fractions in base two",
      ex("Change 0.101 in base two to a decimal", ["The places after the point are 1/2, 1/4, 1/8.", "0.101 = 1/2 + 0 + 1/8 = 5/8 = 0.625."]),
      "H|Finding an unknown base",
      ex("Find x if 25 in base x equals 19 in base ten", ["25 in base x means 2x + 5.", "2x + 5 = 19, so 2x = 14 and x = 7.", "Check: the digit 5 is less than 7, so base seven is allowed."]),
    ],
    devices: [
      "In base n the digits are 0 to n − 1.",
      "To change between two bases that are not ten, go through base ten.",
      "Carry when you reach the base, not when you reach ten.",
      "A number in base two is made of powers of two: 1, 2, 4, 8, 16, 32 …",
      "Always write the base as a small subscript in examinations, e.g. 101₂.",
    ],
    classwork: [
      { q: "Change 110101 in base two to base ten.", a: "32 + 16 + 4 + 1 = 53." },
      { q: "Change 31 in base ten to base two.", a: "31 = 16 + 8 + 4 + 2 + 1, so 11111 in base two." },
      { q: "Add 24 and 13 in base five.", a: "24₅ = 14 and 13₅ = 8. 14 + 8 = 22 = 4 × 5 + 2, so 42 in base five." },
    ],
    assignment: [
      { q: "Change 100 in base ten to base seven.", a: "100 ÷ 7 = 14 r 2; 14 ÷ 7 = 2 r 0; 2 ÷ 7 = 0 r 2. The answer is 202 in base seven." },
      { q: "Find y if 31 in base y equals 16 in base ten.", a: "3y + 1 = 16, so y = 5." },
    ],
    quiz: [
      mc("1001 in base two equals", "9", "8", "10", "5"),
      mc("The digits used in base six are", "0 to 5", "1 to 6", "0 to 6", "0 to 9"),
      mc("12 in base ten, written in base two, is", "1100", "1010", "1001", "1110"),
      mc("What is 11 + 1 in base two?", "100", "12", "10", "101"),
    ],
  },
  sets: {
    title: "Chapter 2 · Sets and Venn Diagrams",
    focus: "Grouping objects, and solving problems with two sets",
    label: "Chapter 2",
    scene: sc(["🔵", "🔴", "📚"], "#cfe8ff", "#c9e7a5", "Two overlapping circles show what the groups share."),
    diagram: VENN,
    lines: [
      "P|A set is a well-defined collection of objects, called elements or members. We write sets in curly brackets: A = {1, 2, 3}. We write 2 ∈ A (2 belongs to A) and 5 ∉ A (5 does not belong to A).",
      table(["Symbol", "Meaning"], [["A ∪ B", "union: elements in A or B or both"], ["A ∩ B", "intersection: elements in both A and B"], ["A′", "complement: elements of the universal set not in A"], ["A ⊂ B", "A is a subset of B"], ["n(A)", "number of elements in A"], ["∅", "the empty set"]]),
      ex("Given A = {1, 2, 3, 4, 5} and B = {4, 5, 6, 7}, find A ∪ B, A ∩ B and the elements in A but not in B", ["A ∪ B = {1, 2, 3, 4, 5, 6, 7}.", "A ∩ B = {4, 5}.", "In A but not B: {1, 2, 3}.", "Check: n(A ∪ B) = n(A) + n(B) − n(A ∩ B) = 5 + 4 − 2 = 7."]),
      ex("How many subsets has {a, b, c}?", ["A set with n elements has 2ⁿ subsets.", "2³ = 8 subsets, including the empty set and the set itself."]),
      "H|Solving a problem with a Venn diagram",
      ex("In a class of 40, 25 like Mathematics, 20 like English and 8 like neither. How many like both?", ["Students who like at least one subject = 40 − 8 = 32.", "n(M ∪ E) = n(M) + n(E) − n(M ∩ E), so 32 = 25 + 20 − both.", "both = 45 − 32 = 13.", "Only Mathematics: 25 − 13 = 12. Only English: 20 − 13 = 7.", "Check the total: 12 + 13 + 7 + 8 = 40."]),
    ],
    devices: [
      "Always start filling a Venn diagram from the middle (the intersection).",
      "n(A ∪ B) = n(A) + n(B) − n(A ∩ B).",
      "A set with n elements has 2ⁿ subsets.",
      "n(A′) = n(ξ) − n(A), where ξ is the universal set.",
      "The empty set is a subset of every set.",
    ],
    classwork: [
      { q: "List the elements of {x : x is a prime number less than 12}.", a: "{2, 3, 5, 7, 11}." },
      { q: "If P = {1, 3, 5} and Q = {3, 4, 5, 6}, find P ∩ Q.", a: "{3, 5}." },
      { q: "How many subsets has a set of 4 elements?", a: "2⁴ = 16." },
    ],
    assignment: [
      { q: "In a group of 30 traders, 18 sell yam, 15 sell rice and 5 sell neither. How many sell both?", a: "At least one: 25. 25 = 18 + 15 − both, so both = 8." },
      { q: "Given ξ = {1, 2, 3, …, 10} and A = {2, 4, 6, 8, 10}, find A′.", a: "A′ = {1, 3, 5, 7, 9}." },
    ],
    quiz: [
      mc("A ∩ B means", "elements in both A and B", "elements in A or B", "elements not in A", "elements only in A"),
      mc("If n(A) = 6, n(B) = 4 and n(A ∩ B) = 2, then n(A ∪ B) =", "8", "10", "12", "6"),
      mc("A set with 3 elements has how many subsets?", "8", "6", "9", "3"),
      mc("∅ stands for", "the empty set", "the universal set", "zero", "infinity"),
    ],
  },
  variation: {
    title: "Chapter 3 · Variation",
    focus: "Direct, inverse, joint and partial variation",
    label: "Chapter 3",
    scene: sc(["⛽", "🚗", "⏱️"], "#ffe7b3", "#c9e7a5", "The more fuel you buy, the more you pay: direct variation."),
    diagram: hyper,
    lines: [
      "P|Variation describes how one quantity changes when another changes. Write the variation as a statement, replace ∝ with = k ×, find the constant k from the given values, then use it.",
      table(["Type", "Statement", "Equation"], [["Direct", "y varies directly as x", "y = kx"], ["Inverse", "y varies inversely as x", "y = k/x"], ["Direct (square)", "y varies as x²", "y = kx²"], ["Joint", "z varies as x and y", "z = kxy"], ["Partial", "y is partly constant, partly varies as x", "y = a + bx"]]),
      ex("y varies directly as x, and y = 12 when x = 3. Find y when x = 7", ["y = kx. Put in 12 = k × 3, so k = 4.", "The law is y = 4x.", "When x = 7, y = 4 × 7 = 28."]),
      ex("y varies inversely as x, and y = 6 when x = 4. Find y when x = 8", ["y = k/x, so 6 = k/4 and k = 24.", "The law is y = 24/x.", "When x = 8, y = 24/8 = 3."]),
      ex("y varies as x², and y = 50 when x = 5. Find y when x = 10", ["y = kx², so 50 = k × 25 and k = 2.", "When x = 10, y = 2 × 100 = 200."]),
      ex("z varies jointly as x and y. z = 24 when x = 2 and y = 3. Find z when x = 5 and y = 6", ["z = kxy, so 24 = k × 6 and k = 4.", "z = 4 × 5 × 6 = 120."]),
      ex("P is partly constant and partly varies as n. P = 40 when n = 2 and P = 70 when n = 5. Find P when n = 8", ["P = a + bn. Then a + 2b = 40 and a + 5b = 70.", "Subtract: 3b = 30, so b = 10. Then a = 40 − 20 = 20.", "P = 20 + 10n. When n = 8, P = 20 + 80 = 100."]),
    ],
    devices: [
      "Step 1: write the law with k. Step 2: find k. Step 3: write the full law. Step 4: use it.",
      "Direct: both increase together. Inverse: one increases as the other decreases.",
      "In inverse variation, x × y stays constant.",
      "Joint variation: the quantity varies as a product.",
      "Partial variation has two unknown constants, so you need two sets of values.",
    ],
    classwork: [
      { q: "y ∝ x and y = 10 when x = 2. Find y when x = 9.", a: "k = 5, so y = 45." },
      { q: "y varies inversely as x and y = 5 when x = 6. Find k.", a: "k = 5 × 6 = 30." },
      { q: "If y = kx² and y = 18 when x = 3, find k.", a: "18 = 9k, so k = 2." },
    ],
    assignment: [
      { q: "The time (t) to finish a job varies inversely as the number of workers (n). 6 workers take 10 days. How long will 15 workers take?", a: "t = k/n, 10 = k/6, k = 60. t = 60/15 = 4 days." },
      { q: "y varies directly as the square of x. If y = 36 when x = 3, find y when x = 5.", a: "k = 36/9 = 4. y = 4 × 25 = 100." },
    ],
    quiz: [
      mc("If y varies inversely as x, then x × y is", "constant", "increasing", "zero", "equal to x"),
      mc("If y = kx and y = 20 when x = 4, then k =", "5", "80", "16", "24"),
      mc("A graph of direct variation is", "a straight line through the origin", "a curve that never meets the axes", "a parabola", "a horizontal line"),
      mc("Joint variation z = kxy: if x = 2, y = 5, z = 30, then k =", "3", "10", "300", "7"),
    ],
  },
  circles: {
    title: "Chapter 4 · Circle Geometry",
    focus: "Angle properties of circles, cyclic quadrilaterals and tangents",
    label: "Chapter 4",
    scene: sc(["⭕", "📐", "🔵"], "#cfe8ff", "#c9e7a5", "The circle has more angle laws than any other shape."),
    diagram: CIRCLE,
    lines: [
      "P|Learn these theorems and name the one you use when you write your reasons in an examination.",
      "R|<ul><li><b>Angle at the centre:</b> the angle at the centre is twice the angle at the circumference on the same arc.</li><li><b>Angles in the same segment</b> are equal.</li><li><b>Angle in a semicircle</b> is 90°.</li><li><b>Cyclic quadrilateral:</b> opposite angles add up to 180°. The exterior angle equals the opposite interior angle.</li><li><b>Tangent:</b> a tangent is perpendicular to the radius at the point of contact. Two tangents from an outside point are equal in length.</li><li><b>Alternate segment theorem:</b> the angle between a tangent and a chord equals the angle in the alternate segment.</li></ul>",
      ex("The angle at the circumference is 35°. Find the angle at the centre standing on the same arc", ["Angle at the centre = 2 × angle at the circumference.", "2 × 35° = 70°."]),
      ex("ABCD is a cyclic quadrilateral and ∠A = 110°. Find ∠C", ["Opposite angles of a cyclic quadrilateral add up to 180°.", "∠C = 180° − 110° = 70°."]),
      ex("AB is a diameter and C is on the circle. Find ∠ACB", ["The angle in a semicircle is 90°.", "∠ACB = 90°."]),
      ex("A tangent from a point P touches a circle of radius 5 cm at T. The centre O is 13 cm from P. Find PT", ["The radius OT meets the tangent at 90°, so triangle OTP is right-angled at T.", "PT² = 13² − 5² = 169 − 25 = 144.", "PT = 12 cm."]),
    ],
    devices: [
      "Centre angle = 2 × circumference angle (same arc).",
      "Semicircle angle = 90°.",
      "Cyclic quadrilateral: opposite angles are supplementary (sum 180°).",
      "Tangent ⟂ radius at the point of contact.",
      "Always state the reason for each step you write.",
    ],
    classwork: [
      { q: "The angle at the centre is 120°. Find the angle at the circumference on the same arc.", a: "120° ÷ 2 = 60°." },
      { q: "Two opposite angles of a cyclic quadrilateral are x and 95°. Find x.", a: "x = 180° − 95° = 85°." },
      { q: "A tangent is drawn from a point 10 cm from the centre of a circle of radius 6 cm. Find its length.", a: "√(100 − 36) = √64 = 8 cm." },
    ],
    assignment: [
      { q: "PQRS is a cyclic quadrilateral with ∠P = 2x and ∠R = x + 60°. Find x and ∠P.", a: "Opposite angles: 2x + x + 60° = 180°, so 3x = 120° and x = 40°. ∠P = 80°." },
      { q: "In a circle, ∠ACB = 40° in the major segment and AB is a chord. Find the angle AOB at the centre.", a: "80°, since the centre angle is twice the circumference angle." },
    ],
    quiz: [
      mc("The angle in a semicircle is", "90°", "180°", "45°", "60°"),
      mc("The opposite angles of a cyclic quadrilateral add up to", "180°", "360°", "90°", "270°"),
      mc("A tangent meets the radius at the point of contact at", "90°", "45°", "180°", "60°"),
      mc("The angle at the centre is ___ the angle at the circumference.", "twice", "half", "equal to", "three times"),
    ],
  },
  stats: {
    title: "Chapter 5 · Statistics: Frequency Tables, Grouped Data and Spread",
    focus: "Mean from tables, the histogram, the median and the standard deviation",
    label: "Chapter 5",
    scene: sc(["📊", "📈", "🧮"], "#d9f0ff", "#c9e7a5", "A frequency table summarises many numbers in a few lines."),
    diagram: HIST,
    lines: [
      "P|When the same value appears many times, we record it with its frequency (f). The mean is Σfx ÷ Σf, where Σ means 'the sum of'.",
      ex("Find the mean of the data: x = 2, 3, 4, 5 with frequencies f = 2, 3, 4, 1", ["Σf = 2 + 3 + 4 + 1 = 10.", "Σfx = 2×2 + 3×3 + 4×4 + 5×1 = 4 + 9 + 16 + 5 = 34.", "Mean = 34 ÷ 10 = 3.4."]),
      "H|Grouped data",
      "P|For classes such as 0–9, 10–19, use the class mid-point as x. The class with the highest frequency is the modal class.",
      ex("Marks 0–9, 10–19, 20–29, 30–39 have frequencies 4, 6, 8, 2. Find the mean", ["Mid-points: 4.5, 14.5, 24.5, 34.5.", "Σf = 20. Σfx = 4×4.5 + 6×14.5 + 8×24.5 + 2×34.5 = 18 + 87 + 196 + 69 = 370.", "Mean = 370 ÷ 20 = 18.5."]),
      "H|Median and cumulative frequency",
      "P|Add the frequencies as you go down to get the cumulative frequency. The median is the value at position (n + 1) ÷ 2, or the value where the cumulative frequency reaches half of the total.",
      "H|Standard deviation",
      "P|The standard deviation measures how far the data are spread from the mean: SD = √(Σ(x − mean)² ÷ n).",
      ex("Find the standard deviation of 2, 4, 4, 4, 5, 5, 7, 9", ["Mean = 40 ÷ 8 = 5.", "Squares of the differences: 9, 1, 1, 1, 0, 0, 4, 16. Sum = 32.", "Variance = 32 ÷ 8 = 4.", "Standard deviation = √4 = 2."]),
    ],
    devices: [
      "Mean = Σfx ÷ Σf.",
      "For grouped data use the class mid-point.",
      "Mode: most frequent. Median: middle value. Mean: the balance point.",
      "Variance = the average of the squared differences; SD = √variance.",
      "A small standard deviation means the data are close together.",
    ],
    classwork: [
      { q: "Find the mean of x = 1, 2, 3 with f = 3, 4, 3.", a: "Σf = 10; Σfx = 3 + 8 + 9 = 20. Mean = 2." },
      { q: "State the median of 3, 8, 1, 9, 4.", a: "Ordered: 1, 3, 4, 8, 9. The median is 4." },
      { q: "Find the mid-point of the class 20–29.", a: "(20 + 29) ÷ 2 = 24.5." },
    ],
    assignment: [
      { q: "Find the standard deviation of 1, 3, 5, 7.", a: "Mean = 4. Differences squared: 9, 1, 1, 9; sum = 20; variance = 5; SD = √5 ≈ 2.24." },
      { q: "Find the mean of the heights 150, 160, 170 with frequencies 2, 5, 3.", a: "Σf = 10; Σfx = 300 + 800 + 510 = 1,610. Mean = 161." },
    ],
    quiz: [
      mc("The mean of a frequency table is", "Σfx ÷ Σf", "Σf ÷ Σfx", "Σx ÷ Σf", "Σfx × Σf"),
      mc("The modal class is the class with the", "highest frequency", "highest marks", "lowest frequency", "middle position"),
      mc("The standard deviation of 5, 5, 5, 5 is", "0", "5", "1", "20"),
      mc("The median of 2, 4, 6, 8 is", "5", "4", "6", "20"),
    ],
  },
  mensuration: {
    title: "Chapter 6 · Mensuration: Arcs, Sectors, Cones and Spheres",
    focus: "Lengths and areas of curved shapes",
    label: "Chapter 6",
    scene: sc(["🍕", "🏐", "🍦"], "#ffe7b3", "#c9e7a5", "A slice of pizza is a sector; a ball is a sphere."),
    diagram: SECTOR,
    lines: [
      "P|A sector is a 'slice' of a circle between two radii. Its angle at the centre is θ.",
      "R|<ul><li>Arc length = θ/360 × 2πr</li><li>Area of sector = θ/360 × πr²</li><li>Perimeter of sector = arc length + 2r</li><li>Sphere: volume = 4/3 πr³ and surface area = 4πr²</li><li>Cone: slant height l = √(r² + h²), curved surface area = πrl</li></ul>",
      ex("A sector of angle 90° is cut from a circle of radius 14 cm. Find the arc length, the area and the perimeter (π = 22/7)", ["Arc length = 90/360 × 2 × 22/7 × 14 = 1/4 × 88 = 22 cm.", "Area = 1/4 × 22/7 × 14 × 14 = 1/4 × 616 = 154 cm².", "Perimeter = 22 + 14 + 14 = 50 cm."]),
      ex("Find the volume and surface area of a sphere of radius 7 cm (π = 22/7)", ["Volume = 4/3 × 22/7 × 7 × 7 × 7 = 4/3 × 22 × 49 = 4/3 × 1,078 = 4,312/3 = 1,437 1/3 cm³.", "Surface area = 4 × 22/7 × 7 × 7 = 4 × 22 × 7 = 616 cm²."]),
      ex("A cone has radius 7 cm and height 24 cm. Find its slant height and its curved surface area (π = 22/7)", ["l = √(7² + 24²) = √(49 + 576) = √625 = 25 cm.", "Curved surface area = π r l = 22/7 × 7 × 25 = 22 × 25 = 550 cm²."]),
      ex("A sector of angle 72° and radius 10 cm is bent to form a cone. Find the radius of the cone's base (leave π unevaluated)", ["Arc length of the sector = 72/360 × 2π × 10 = 1/5 × 20π = 4π.", "This arc becomes the circumference of the base: 2πr = 4π.", "r = 2 cm."]),
    ],
    devices: [
      "Arc length = θ/360 × 2πr. Sector area = θ/360 × πr².",
      "The perimeter of a sector includes the two radii.",
      "Sphere volume 4/3πr³; surface area 4πr².",
      "Cone: l² = r² + h²; curved area πrl; volume ⅓πr²h.",
      "Check the units: lengths in cm, areas in cm², volumes in cm³.",
    ],
    classwork: [
      { q: "Find the arc length of a sector of angle 60° and radius 21 cm (π = 22/7).", a: "1/6 × 2 × 22/7 × 21 = 1/6 × 132 = 22 cm." },
      { q: "Find the area of a sector of angle 180° and radius 7 cm (π = 22/7).", a: "1/2 × 22/7 × 49 = 77 cm²." },
      { q: "Find the surface area of a sphere of radius 3.5 cm (π = 22/7).", a: "4 × 22/7 × 3.5 × 3.5 = 154 cm²." },
    ],
    assignment: [
      { q: "A cone has base radius 6 cm and slant height 10 cm. Find its height and volume in terms of π.", a: "h = √(100 − 36) = 8 cm. Volume = 1/3 × π × 36 × 8 = 96π cm³." },
      { q: "A sector has radius 12 cm and angle 120°. Find its area in terms of π.", a: "120/360 × π × 144 = 48π cm²." },
    ],
    quiz: [
      mc("The arc length of a sector is", "θ/360 × 2πr", "θ/360 × πr²", "πr²", "2πr²"),
      mc("The surface area of a sphere is", "4πr²", "4/3 πr³", "πr²", "2πr"),
      mc("A cone has r = 3 and h = 4. Its slant height is", "5", "7", "12", "25"),
      mc("A sector of 90° in a circle of area 100 cm² has area", "25 cm²", "50 cm²", "10 cm²", "90 cm²"),
    ],
  },
  matrices: {
    title: "Chapter 7 · Matrices and Determinants",
    focus: "Adding, multiplying and inverting 2 × 2 matrices",
    label: "Chapter 7",
    scene: sc(["🔢", "🧮", "🧩"], "#e9e0ff", "#c9e7a5", "A matrix arranges numbers in rows and columns."),
    lines: [
      "P|A matrix is a rectangular arrangement of numbers in rows and columns. Below we write a matrix by its rows, separated by semicolons: for example A = (2 1; 3 4) has first row 2, 1 and second row 3, 4. A 2 × 2 matrix has 2 rows and 2 columns.",
      "H|Addition and multiplication",
      "P|To add matrices, add the numbers in the same positions. To multiply, take each row of the first matrix and multiply it, entry by entry, with each column of the second, then add.",
      ex("If A = (2 1; 3 4) and B = (1 0; 2 5), find A + B and AB", ["A + B = (2+1, 1+0; 3+2, 4+5) = (3 1; 5 9).", "AB row 1, column 1: 2×1 + 1×2 = 4. Row 1, column 2: 2×0 + 1×5 = 5.", "Row 2, column 1: 3×1 + 4×2 = 11. Row 2, column 2: 3×0 + 4×5 = 20.", "AB = (4 5; 11 20)."]),
      "H|Determinant and inverse",
      "P|For A = (a b; c d), the determinant is |A| = ad − bc. The inverse is A⁻¹ = 1/|A| × (d −b; −c a). A matrix with determinant 0 has no inverse (it is singular).",
      ex("Find the determinant of A = (2 1; 3 4) and the inverse of C = (3 1; 5 2)", ["|A| = 2×4 − 1×3 = 8 − 3 = 5.", "|C| = 3×2 − 1×5 = 6 − 5 = 1.", "C⁻¹ = 1/1 × (2 −1; −5 3) = (2 −1; −5 3)."]),
      "H|Solving simultaneous equations by matrices",
      ex("Solve 3x + y = 5 and 5x + 2y = 9", ["Write C (x; y) = (5; 9), where C = (3 1; 5 2).", "Multiply both sides by C⁻¹ = (2 −1; −5 3): (x; y) = (2×5 − 1×9; −5×5 + 3×9) = (1; 2).", "x = 1 and y = 2. Check: 3 + 2 = 5 and 5 + 4 = 9."]),
    ],
    devices: [
      "Add matrices of the same size only.",
      "Matrix multiplication is not commutative: AB is usually not BA.",
      "Determinant of (a b; c d) is ad − bc.",
      "Inverse: swap a and d, change the signs of b and c, divide by the determinant.",
      "If the determinant is zero, the matrix has no inverse.",
    ],
    classwork: [
      { q: "Find (1 2; 3 4) + (5 6; 7 8).", a: "(6 8; 10 12)." },
      { q: "Find the determinant of (4 3; 2 1).", a: "4×1 − 3×2 = 4 − 6 = −2." },
      { q: "Find 2 × (3 −1; 0 5).", a: "(6 −2; 0 10)." },
    ],
    assignment: [
      { q: "Find the inverse of (4 3; 1 1).", a: "Determinant = 4 − 3 = 1. Inverse = (1 −3; −1 4)." },
      { q: "Solve 2x + y = 7 and x + y = 4 using matrices.", a: "Matrix (2 1; 1 1) has determinant 1, inverse (1 −1; −1 2). (x; y) = (1×7 − 1×4; −1×7 + 2×4) = (3; 1). So x = 3, y = 1." },
    ],
    quiz: [
      mc("The determinant of (a b; c d) is", "ad − bc", "ad + bc", "ab − cd", "ac − bd"),
      mc("A matrix with determinant 0 is called", "singular", "unit", "identity", "inverse"),
      mc("(1 2; 3 4) + (1 1; 1 1) =", "(2 3; 4 5)", "(1 2; 3 4)", "(2 2; 4 4)", "(3 4; 5 6)"),
      mc("The determinant of (2 0; 0 3) is", "6", "5", "0", "1"),
    ],
  },
  coords: {
    title: "Chapter 8 · Coordinate Geometry of Straight Lines",
    focus: "Distance, mid-point, gradient and the equation of a line",
    label: "Chapter 8",
    scene: sc(["📍", "📏", "🗺️"], "#d9f0ff", "#c9e7a5", "Every point on a map has coordinates."),
    lines: [
      "P|For points A(x₁, y₁) and B(x₂, y₂):",
      "R|<ul><li>Distance AB = √[(x₂ − x₁)² + (y₂ − y₁)²]</li><li>Mid-point = ((x₁ + x₂)/2, (y₁ + y₂)/2)</li><li>Gradient m = (y₂ − y₁)/(x₂ − x₁)</li><li>Equation of a line through (x₁, y₁) with gradient m: y − y₁ = m(x − x₁)</li><li>Parallel lines have equal gradients. Perpendicular lines have gradients whose product is −1.</li></ul>",
      ex("Find the distance, mid-point and gradient of the line joining A(1, 2) and B(7, 10)", ["Distance = √(6² + 8²) = √(36 + 64) = √100 = 10.", "Mid-point = ((1 + 7)/2, (2 + 10)/2) = (4, 6).", "Gradient = (10 − 2)/(7 − 1) = 8/6 = 4/3."]),
      ex("Find the equation of the line through (1, 2) and (3, 8)", ["Gradient = (8 − 2)/(3 − 1) = 3.", "y − 2 = 3(x − 1), so y = 3x − 3 + 2 = 3x − 1.", "Check with (3, 8): 3×3 − 1 = 8. Correct."]),
      ex("Find the gradient of a line perpendicular to y = 2x + 1", ["The gradient of y = 2x + 1 is 2.", "For perpendicular lines m₁ × m₂ = −1, so m₂ = −1/2."]),
    ],
    devices: [
      "Gradient = rise ÷ run = (y₂ − y₁)/(x₂ − x₁).",
      "y = mx + c: m is the gradient, c the y-intercept.",
      "Parallel: m₁ = m₂. Perpendicular: m₁ m₂ = −1.",
      "Distance formula comes from Pythagoras' theorem.",
      "Mid-point: the average of the x values and the average of the y values.",
    ],
    classwork: [
      { q: "Find the mid-point of (2, 4) and (8, 10).", a: "(5, 7)." },
      { q: "Find the distance between (0, 0) and (6, 8).", a: "√(36 + 64) = 10." },
      { q: "Find the gradient of the line through (1, 1) and (4, 7).", a: "6/3 = 2." },
    ],
    assignment: [
      { q: "Find the equation of the line through (2, 3) with gradient 2.", a: "y − 3 = 2(x − 2), so y = 2x − 1." },
      { q: "Show that the lines y = 3x + 1 and y = 3x − 5 are parallel.", a: "Both have gradient 3, so they are parallel." },
    ],
    quiz: [
      mc("The gradient of the line y = 4x − 7 is", "4", "−7", "7", "−4"),
      mc("The mid-point of (0, 0) and (4, 6) is", "(2, 3)", "(4, 6)", "(1, 1.5)", "(6, 4)"),
      mc("The gradient of a line perpendicular to a line of gradient 2 is", "−1/2", "1/2", "−2", "2"),
      mc("The distance between (1, 1) and (4, 5) is", "5", "7", "25", "3"),
    ],
  },
  integration: {
    title: "Chapter 9 · Introduction to Integration",
    focus: "The reverse of differentiation, and area under a curve",
    label: "Chapter 9",
    scene: sc(["∫", "📈", "🧮"], "#ffe7b3", "#c9e7a5", "Integration adds up tiny pieces to find an area or a total."),
    lines: [
      "P|Integration is the reverse of differentiation. If dy/dx = xⁿ, then y = xⁿ⁺¹ ÷ (n + 1) + c, for n not equal to −1. The letter c is the constant of integration: it is there because the derivative of a constant is zero.",
      ex("Integrate 3x² with respect to x", ["Add 1 to the power: 3x² becomes 3x³/3.", "Divide by the new power: 3 × x³ ÷ 3 = x³.", "∫ 3x² dx = x³ + c."]),
      ex("Integrate 4x + 5", ["∫ 4x dx = 4x²/2 = 2x².", "∫ 5 dx = 5x.", "∫ (4x + 5) dx = 2x² + 5x + c."]),
      "H|Finding the constant",
      ex("The gradient of a curve is dy/dx = 6x and the curve passes through (1, 7). Find the equation of the curve", ["y = ∫ 6x dx = 3x² + c.", "Put in x = 1, y = 7: 7 = 3 + c, so c = 4.", "The curve is y = 3x² + 4."]),
      "H|Definite integrals and area",
      "P|A definite integral has limits. ∫ from a to b of f(x) dx = F(b) − F(a), where F is the integral of f. It gives the area under the curve between x = a and x = b (when the curve is above the axis). We do not need +c for definite integrals.",
      ex("Evaluate the integral of 3x² from x = 0 to x = 2", ["F(x) = x³.", "F(2) − F(0) = 8 − 0 = 8."]),
      ex("Find the area under y = 2x between x = 0 and x = 3", ["F(x) = x².", "F(3) − F(0) = 9 − 0 = 9 square units.", "Check: the shape is a triangle with base 3 and height 6, so its area is ½ × 3 × 6 = 9."]),
    ],
    devices: [
      "∫ xⁿ dx = xⁿ⁺¹/(n + 1) + c (n ≠ −1).",
      "Integration and differentiation undo each other.",
      "Always add + c for an indefinite integral.",
      "Definite integral: F(upper) − F(lower).",
      "Area under a curve above the x-axis = definite integral.",
    ],
    classwork: [
      { q: "Integrate 6x.", a: "3x² + c." },
      { q: "Integrate x³.", a: "x⁴/4 + c." },
      { q: "Evaluate the integral of 2x from 0 to 4.", a: "[x²] = 16 − 0 = 16." },
    ],
    assignment: [
      { q: "Find y if dy/dx = 4x + 1 and y = 5 when x = 0.", a: "y = 2x² + x + c; 5 = 0 + c, so y = 2x² + x + 5." },
      { q: "Find the area under y = x² between x = 0 and x = 3.", a: "[x³/3] from 0 to 3 = 27/3 = 9 square units." },
    ],
    quiz: [
      mc("∫ 2x dx =", "x² + c", "2x² + c", "2 + c", "x + c"),
      mc("∫ x² dx =", "x³/3 + c", "2x + c", "x³ + c", "x²/2 + c"),
      mc("Integration is the reverse of", "differentiation", "addition", "division", "subtraction"),
      mc("The integral of 3 with respect to x is", "3x + c", "3 + c", "x + c", "0"),
    ],
  },
};
