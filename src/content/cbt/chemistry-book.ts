/** FODAN Chemistry textbook, SSS1–SSS3, following the NERDC Chemistry curriculum (WAEC, NECO, JAMB). Original text. */

import type { PoeticWork } from "./poetic-types";
import { mc, sc, ex, fig, t, table, makeBook } from "./book-kit";

const shell = (cx: number, cy: number, rs: number[], el: number[], color: string) =>
  rs.map((r, i) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="1.5"/>`).join("") +
  `<circle cx="${cx}" cy="${cy}" r="5" fill="${color}"/>` +
  rs.map((r, i) => Array.from({ length: el[i] }, (_, k) => { const a = (k / el[i]) * Math.PI * 2 - Math.PI / 2; return `<circle cx="${(cx + r * Math.cos(a)).toFixed(1)}" cy="${(cy + r * Math.sin(a)).toFixed(1)}" r="3" fill="#0b1f4b"/>`; }).join("")).join("");
const IONIC = fig(
  "Ionic bonding: sodium (2,8,1) gives one electron to chlorine (2,8,7) to form Na⁺ and Cl⁻",
  `${shell(70, 72, [14, 27, 40], [2, 8, 1], "#1d4ed8")}${t(70, 128, "Na  2,8,1", 11)}<path d="M112,48 Q150,20 190,48" fill="none" stroke="#dc2626" stroke-width="2"/>${t(150, 30, "1 electron moves", 10, "middle", "#dc2626")}${shell(250, 72, [14, 27, 40], [2, 8, 7], "#15803d")}${t(250, 128, "Cl  2,8,7", 11)}${t(160, 142, "Opposite charges attract: NaCl", 10, "middle", "#64748b", 600)}`,
  150,
);
const ENERGY = fig(
  "Energy profile of an exothermic reaction: products have less energy, so energy is given out (ΔH is negative)",
  `<line x1="40" y1="125" x2="300" y2="125" stroke="#94a3b8" stroke-width="1.5"/><line x1="40" y1="20" x2="40" y2="125" stroke="#94a3b8" stroke-width="1.5"/><path d="M45,50 L100,50 Q130,50 150,20 Q170,50 190,95 L290,95" fill="none" stroke="#dc2626" stroke-width="3"/>${t(75, 44, "Reactants", 10)}${t(255, 88, "Products", 10)}${t(155, 14, "activation energy", 10, "middle", "#b45309")}<line x1="230" y1="50" x2="230" y2="95" stroke="#15803d" stroke-width="2"/>${t(264, 76, "ΔH", 11, "middle", "#15803d")}${t(30, 70, "energy", 9, "middle", "#64748b", 600)}`,
  145,
);
const ALKANES = fig(
  "The first three alkanes: CH₄ (methane), C₂H₆ (ethane) and C₃H₈ (propane); each carbon forms four bonds",
  `<g font-size="12" font-weight="700" fill="#0b1f4b" text-anchor="middle"><text x="50" y="62">H</text><text x="50" y="102">H</text><text x="25" y="82">H</text><text x="75" y="82">H</text><text x="50" y="82" fill="#b45309">C</text><text x="150" y="82" fill="#b45309">C</text><text x="180" y="82" fill="#b45309">C</text><text x="150" y="62">H</text><text x="180" y="62">H</text><text x="150" y="102">H</text><text x="180" y="102">H</text><text x="128" y="82">H</text><text x="202" y="82">H</text></g><g stroke="#0b1f4b" stroke-width="2"><line x1="50" y1="66" x2="50" y2="76"/><line x1="50" y1="88" x2="50" y2="96"/><line x1="30" y1="80" x2="44" y2="80"/><line x1="56" y1="80" x2="68" y2="80"/><line x1="150" y1="66" x2="150" y2="76"/><line x1="150" y1="88" x2="150" y2="96"/><line x1="180" y1="66" x2="180" y2="76"/><line x1="180" y1="88" x2="180" y2="96"/><line x1="132" y1="80" x2="144" y2="80"/><line x1="156" y1="80" x2="174" y2="80"/><line x1="186" y1="80" x2="196" y2="80"/></g>${t(50, 122, "methane CH₄", 10)}${t(165, 122, "ethane C₂H₆", 10)}${t(265, 82, "CₙH₂ₙ₊₂", 13, "middle", "#be185d")}${t(265, 100, "alkane formula", 10, "middle", "#64748b", 600)}`,
  140,
);

export const CHEMISTRY_BOOK: PoeticWork = makeBook({
  source: "FODAN Chemistry Textbook SSS1-SSS3",
  title: "FODAN Chemistry · SSS1–SSS3",
  subtitle: "Atoms and bonding, the mole, acids and titration, redox, energy, organic chemistry and metals for WAEC, NECO and JAMB",
  intro: "This textbook follows the NERDC Senior Secondary Chemistry curriculum. SSS1: atoms, the periodic table and bonding; the mole and calculations; acids, bases, salts and titration. SSS2: oxidation, reduction and electrolysis; energy changes, rates and equilibrium. SSS3: organic chemistry; metals and industrial chemistry. Atomic masses used: H = 1, C = 12, N = 14, O = 16, Na = 23, Mg = 24, S = 32, Cl = 35.5, Ca = 40, Cu = 64.",
  groups: [
    ["SSS1", [
      {
        title: "Chapter 1 · Atoms, the Periodic Table and Bonding", focus: "Structure of the atom, electron arrangement and how atoms join", label: "Chapter 1",
        scene: sc(["⚛️", "🧂", "💧"], "#e9e0ff", "#c9e7a5", "Atoms join by transferring or sharing electrons."),
        diagram: IONIC,
        lines: [
          "P|An atom is made of protons (positive, in the nucleus), neutrons (no charge, in the nucleus) and electrons (negative, in shells around the nucleus). Atomic number = number of protons; mass number = protons + neutrons. Isotopes are atoms of the same element with different numbers of neutrons (chlorine-35 and chlorine-37).",
          "H|Electron arrangement",
          "P|Electrons fill shells in order: 2 in the first, 8 in the second, 8 in the third (for the first 20 elements). Sodium (atomic number 11) is 2, 8, 1; chlorine (17) is 2, 8, 7; neon (10) is 2, 8, a full outer shell. The number of outer electrons gives the group, and the number of shells gives the period.",
          table(["Group", "Name", "Outer electrons", "Example"], [["1", "alkali metals", "1", "Li, Na, K"], ["2", "alkaline earth metals", "2", "Mg, Ca"], ["7 (17)", "halogens", "7", "F, Cl, Br, I"], ["0 (18)", "noble gases", "8 (2 for He)", "He, Ne, Ar"]]),
          "H|Chemical bonding",
          "R|<ul><li><b>Ionic bond:</b> a metal gives electrons to a non-metal, forming positive and negative ions that attract: Na⁺Cl⁻. Ionic compounds are crystalline solids with high melting points and conduct electricity when molten or dissolved.</li><li><b>Covalent bond:</b> non-metals share pairs of electrons: H₂O, CH₄, CO₂. Covalent substances usually have low melting points and do not conduct electricity.</li><li><b>Metallic bond:</b> positive metal ions in a 'sea' of free electrons, which explains why metals conduct and can be shaped.</li></ul>",
          ex("Describe how magnesium (2, 8, 2) and oxygen (2, 6) form magnesium oxide", ["Magnesium has 2 outer electrons and oxygen needs 2 more to fill its shell.", "Magnesium gives 2 electrons to oxygen: Mg²⁺ and O²⁻.", "The ions attract strongly, giving the ionic compound MgO."]),
        ],
        devices: ["Atomic number = protons; mass number = protons + neutrons.", "Electron arrangement: 2, 8, 8 … for the first 20 elements.", "Ionic: transfer of electrons. Covalent: sharing of electrons.", "Elements in the same group have the same number of outer electrons.", "Noble gases are stable because their outer shells are full."],
        classwork: [{ q: "Write the electron arrangement of aluminium (atomic number 13).", a: "2, 8, 3." }, { q: "How many neutrons has an atom with mass number 23 and atomic number 11?", a: "23 − 11 = 12 neutrons." }, { q: "Name the type of bond in NaCl.", a: "An ionic bond." }],
        assignment: [{ q: "Explain why sodium chloride conducts electricity when molten but not when solid.", a: "When molten, the ions are free to move and carry charge; in the solid they are held in fixed positions." }, { q: "Draw the dot-and-cross diagram of water in words.", a: "Oxygen shares one pair of electrons with each of two hydrogen atoms, leaving two lone pairs on oxygen." }],
        quiz: [mc("The number of protons in an atom is its", "atomic number", "mass number", "isotope number", "group"), mc("The electron arrangement of sodium is", "2, 8, 1", "2, 8, 2", "2, 1", "2, 8, 8"), mc("A covalent bond is formed by", "sharing electrons", "transferring electrons", "losing protons", "melting"), mc("Which elements are halogens?", "chlorine and bromine", "sodium and potassium", "helium and neon", "iron and copper")],
      },
      {
        title: "Chapter 2 · The Mole and Chemical Calculations", focus: "Counting particles, masses and volumes of gases", label: "Chapter 2",
        scene: sc(["⚖️", "🧪", "🔢"], "#d9f0ff", "#c9e7a5", "A mole is a fixed number of particles: 6.02 × 10²³."),
        lines: [
          "R|<ul><li>One mole of any substance contains 6.02 × 10²³ particles (Avogadro's number).</li><li>Moles = mass ÷ molar mass: <b>n = m ÷ M</b>.</li><li>Molar volume of any gas at s.t.p. = 22.4 dm³ (litres).</li><li>For a solution: moles = concentration (mol/dm³) × volume (dm³).</li></ul>",
          ex("Find the molar mass of water, and the number of moles in 36 g", ["H₂O: 2 × 1 + 16 = 18 g/mol.", "n = 36 ÷ 18 = 2 mol."]),
          ex("Find the mass of 0.5 mol of carbon dioxide", ["CO₂: 12 + 2 × 16 = 44 g/mol.", "Mass = 0.5 × 44 = 22 g."]),
          ex("Find the volume of 2 mol of hydrogen at s.t.p.", ["Volume = 2 × 22.4 = 44.8 dm³."]),
          ex("Find the percentage of calcium in calcium carbonate, CaCO₃", ["M = 40 + 12 + 3 × 16 = 100.", "% Ca = 40 ÷ 100 × 100 = 40%."]),
          "H|Empirical formula",
          ex("A compound contains 40% C, 6.7% H and 53.3% O by mass. Find its empirical formula", ["Divide by atomic masses: C 40 ÷ 12 = 3.33; H 6.7 ÷ 1 = 6.7; O 53.3 ÷ 16 = 3.33.", "Divide by the smallest (3.33): C 1; H 2; O 1.", "The empirical formula is CH₂O."]),
          "H|Calculations from equations",
          ex("2Mg + O₂ → 2MgO. What mass of magnesium oxide is formed from 12 g of magnesium?", ["Moles of Mg = 12 ÷ 24 = 0.5 mol.", "From the equation, 2 mol Mg gives 2 mol MgO, so 0.5 mol MgO is formed.", "M(MgO) = 24 + 16 = 40. Mass = 0.5 × 40 = 20 g."]),
        ],
        devices: ["n = m ÷ M; n = V ÷ 22.4 for gases at s.t.p.", "Always balance the equation before calculating.", "Use the mole ratio from the balanced equation.", "Empirical formula: divide the percentages by atomic masses, then by the smallest.", "Concentration (mol/dm³) = moles ÷ volume (dm³)."],
        classwork: [{ q: "Find the moles in 11 g of CO₂.", a: "11 ÷ 44 = 0.25 mol." }, { q: "Find the mass of 0.2 mol of NaOH (Na = 23, O = 16, H = 1).", a: "M = 40. Mass = 0.2 × 40 = 8 g." }, { q: "Find the volume of 0.5 mol of any gas at s.t.p.", a: "0.5 × 22.4 = 11.2 dm³." }],
        assignment: [{ q: "Find the number of molecules in 0.1 mol of water.", a: "0.1 × 6.02 × 10²³ = 6.02 × 10²² molecules." }, { q: "CaCO₃ → CaO + CO₂. What volume of CO₂ at s.t.p. is given by 50 g of CaCO₃?", a: "Moles of CaCO₃ = 50 ÷ 100 = 0.5 mol. So 0.5 mol CO₂ = 0.5 × 22.4 = 11.2 dm³." }],
        quiz: [mc("The molar volume of a gas at s.t.p. is", "22.4 dm³", "24 dm³", "2.24 dm³", "1 dm³"), mc("The molar mass of CO₂ is", "44 g/mol", "28 g/mol", "32 g/mol", "12 g/mol"), mc("The number of moles in 20 g of NaOH (M = 40) is", "0.5", "2", "800", "0.05"), mc("Avogadro's number is", "6.02 × 10²³", "6.02 × 10²⁰", "3 × 10⁸", "22.4")],
      },
      {
        title: "Chapter 3 · Acids, Bases, Salts and Titration", focus: "Properties of acids and bases, making salts and volumetric analysis", label: "Chapter 3",
        scene: sc(["🧪", "🍋", "⚗️"], "#e9e0ff", "#c9e7a5", "Titration finds the exact concentration of a solution."),
        lines: [
          "P|An acid is a substance that produces hydrogen ions (H⁺) in water. A base is a substance that accepts hydrogen ions; an alkali is a base that dissolves in water, producing hydroxide ions (OH⁻). Strong acids (HCl, H₂SO₄, HNO₃) ionise completely; weak acids (ethanoic acid) ionise partly. pH 0 to 6 is acidic, 7 neutral, 8 to 14 alkaline.",
          "R|<ul><li>Acid + metal → salt + hydrogen: Mg + 2HCl → MgCl₂ + H₂</li><li>Acid + base → salt + water: HCl + NaOH → NaCl + H₂O</li><li>Acid + carbonate → salt + water + carbon dioxide: CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂</li></ul>",
          "H|Preparation of salts",
          "P|Soluble salts are made by neutralisation or by reacting an acid with an excess of a metal, insoluble base or carbonate, filtering off the excess, then evaporating to crystallise. Insoluble salts are made by precipitation (mix two solutions and filter): AgNO₃ + NaCl → AgCl + NaNO₃.",
          "H|Titration",
          "P|In a titration, a solution in the burette is added to a measured volume in a flask with an indicator, until the end-point. The relationship: (Ca × Va) ÷ (Cb × Vb) = na ÷ nb, where n is the coefficient in the balanced equation.",
          ex("25.0 cm³ of 0.1 mol/dm³ NaOH is neutralised by 20.0 cm³ of HCl. Find the concentration of the acid", ["HCl + NaOH → NaCl + H₂O: the ratio is 1 : 1.", "Moles of NaOH = 0.1 × 25 ÷ 1000 = 0.0025 mol.", "So moles of HCl = 0.0025 mol in 20.0 cm³ (0.020 dm³).", "Concentration = 0.0025 ÷ 0.020 = 0.125 mol/dm³."]),
        ],
        devices: ["Acids give H⁺ ions; alkalis give OH⁻ ions.", "Methyl orange: red in acid, yellow in alkali. Phenolphthalein: colourless in acid, pink in alkali.", "Strong acids ionise completely; weak acids only partly.", "Soluble salts: crystallisation. Insoluble salts: precipitation.", "In a titration read the burette at eye level to the bottom of the meniscus."],
        classwork: [{ q: "Write the equation for magnesium with hydrochloric acid.", a: "Mg + 2HCl → MgCl₂ + H₂." }, { q: "What colour does phenolphthalein turn in an alkali?", a: "Pink." }, { q: "Name the products of an acid with a carbonate.", a: "A salt, water and carbon dioxide." }],
        assignment: [{ q: "20.0 cm³ of 0.2 mol/dm³ NaOH is neutralised by 25.0 cm³ of HCl. Find the concentration of the HCl.", a: "Moles NaOH = 0.2 × 20 ÷ 1000 = 0.004 mol = moles HCl. Concentration = 0.004 ÷ 0.025 = 0.16 mol/dm³." }, { q: "Describe how to make crystals of copper(II) sulphate from copper(II) oxide.", a: "Warm dilute sulphuric acid, add copper(II) oxide until no more dissolves, filter off the excess, evaporate the filtrate to the point of crystallisation and cool." }],
        quiz: [mc("A solution of pH 12 is", "strongly alkaline", "strongly acidic", "neutral", "weakly acidic"), mc("An acid with a carbonate gives", "carbon dioxide", "hydrogen", "oxygen", "nitrogen"), mc("Neutralisation produces", "salt and water", "salt only", "acid and base", "hydrogen only"), mc("Insoluble salts are prepared by", "precipitation", "evaporation only", "distillation", "titration")],
      },
    ]],
    ["SSS2", [
      {
        title: "Chapter 4 · Oxidation, Reduction and Electrolysis", focus: "Electron transfer, oxidation numbers and electrolysis", label: "Chapter 4",
        scene: sc(["🔋", "⚡", "🧪"], "#fff3bf", "#c9e7a5", "Electricity can split compounds into their elements."),
        lines: [
          "P|Oxidation is the loss of electrons (or gain of oxygen, or increase in oxidation number). Reduction is the gain of electrons (or loss of oxygen, or decrease in oxidation number). Remember OIL RIG: Oxidation Is Loss, Reduction Is Gain. A redox reaction has both. The oxidising agent is reduced; the reducing agent is oxidised.",
          ex("In Zn + Cu²⁺ → Zn²⁺ + Cu, identify what is oxidised and what is reduced", ["Zn → Zn²⁺ + 2e⁻: zinc loses electrons, so zinc is oxidised (it is the reducing agent).", "Cu²⁺ + 2e⁻ → Cu: copper ions gain electrons, so they are reduced (the oxidising agent)."]),
          "H|Electrolysis",
          "P|Electrolysis is the breaking down of an ionic compound, molten or in solution, by passing electricity through it. The electrode joined to the negative terminal is the cathode (reduction happens there, positive ions go to it); the electrode joined to the positive terminal is the anode (oxidation happens there, negative ions go to it).",
          table(["Electrolyte", "At the cathode", "At the anode"], [["Molten sodium chloride", "sodium metal", "chlorine gas"], ["Concentrated brine (aq. NaCl)", "hydrogen gas", "chlorine gas (NaOH is left in solution)"], ["Copper(II) sulphate with copper electrodes", "copper is deposited", "copper dissolves"], ["Dilute sulphuric acid", "hydrogen", "oxygen"]]),
          "H|Uses of electrolysis",
          "R|<ul><li>Extraction of reactive metals (sodium, aluminium).</li><li>Purification (refining) of copper.</li><li>Electroplating (a thin layer of silver or chromium on another metal).</li><li>Manufacture of sodium hydroxide and chlorine from brine.</li></ul>",
          ex("Write the half-equations for the electrolysis of molten sodium chloride", ["Cathode: Na⁺ + e⁻ → Na (reduction).", "Anode: 2Cl⁻ → Cl₂ + 2e⁻ (oxidation)."]),
        ],
        devices: ["OIL RIG: oxidation is loss of electrons, reduction is gain.", "Cathode: reduction, positive ions go there. Anode: oxidation, negative ions go there.", "More reactive metals stay in solution, so hydrogen forms at the cathode in aqueous solutions.", "A more reactive metal displaces a less reactive one from its salt.", "Electroplating: the object to be plated is the cathode."],
        classwork: [{ q: "Define oxidation in terms of electrons.", a: "Loss of electrons." }, { q: "At which electrode is chlorine formed in the electrolysis of brine?", a: "At the anode." }, { q: "Name one use of electrolysis.", a: "Electroplating (or purifying copper, extracting aluminium)." }],
        assignment: [{ q: "State what is oxidised and what is reduced: Mg + 2H⁺ → Mg²⁺ + H₂", a: "Magnesium is oxidised (loses electrons); hydrogen ions are reduced (gain electrons)." }, { q: "In refining copper, what are the anode and cathode made of?", a: "The anode is impure copper; the cathode is pure copper." }],
        quiz: [mc("Reduction is the", "gain of electrons", "loss of electrons", "loss of protons", "gain of protons"), mc("The cathode is the electrode joined to the", "negative terminal", "positive terminal", "salt", "anode"), mc("Sodium is obtained by electrolysis of", "molten sodium chloride", "aqueous sodium chloride", "sodium carbonate solution", "sodium nitrate solution"), mc("In OIL RIG, 'OIL' means", "oxidation is loss", "oxygen is lost", "oil is liquid", "ore is lost")],
      },
      {
        title: "Chapter 5 · Energy Changes, Rates and Equilibrium", focus: "Exothermic and endothermic reactions, speed of reactions and reversible reactions", label: "Chapter 5",
        scene: sc(["🔥", "⏱️", "🏭"], "#ffe7e7", "#c9e7a5", "Industry controls conditions to get the most product."),
        diagram: ENERGY,
        lines: [
          "P|Every reaction involves an energy change, often as heat. In an exothermic reaction heat is given out (ΔH is negative): burning, respiration, neutralisation. In an endothermic reaction heat is taken in (ΔH is positive): photosynthesis, dissolving ammonium nitrate. Example: CH₄ + 2O₂ → CO₂ + 2H₂O, ΔH = −890 kJ/mol.",
          "H|Rates of reaction",
          "P|The rate of a reaction is how fast reactants change into products. According to collision theory, a reaction occurs when particles collide with enough energy (the activation energy). The rate is increased by:",
          "R|<ul><li><b>higher concentration</b> (more collisions);</li><li><b>higher temperature</b> (particles move faster and have more energy);</li><li><b>larger surface area</b> (powder reacts faster than lumps);</li><li><b>a catalyst</b> (lowers the activation energy; it is not used up);</li><li><b>higher pressure</b> for gases.</li></ul>",
          "H|Reversible reactions and equilibrium",
          "P|In a reversible reaction (⇌) the products can change back to reactants. Chemical equilibrium is reached when the forward and backward reactions go at the same rate, so the amounts stay constant. Le Chatelier's principle: if a change is made to a system at equilibrium, the system shifts to oppose the change.",
          ex("The Haber process: N₂ + 3H₂ ⇌ 2NH₃, ΔH = −92 kJ/mol. How do pressure and temperature affect the yield of ammonia?", ["Pressure: 4 moles of gas on the left and 2 moles on the right. High pressure shifts the equilibrium to the side with fewer moles, so it increases the yield of ammonia.", "Temperature: the forward reaction is exothermic, so a low temperature increases the yield, but it makes the reaction slow.", "In industry a compromise is used: about 450 °C, high pressure and an iron catalyst."]),
        ],
        devices: ["Exothermic: ΔH negative, heat released. Endothermic: ΔH positive, heat absorbed.", "A catalyst speeds up a reaction without being used up.", "Increasing temperature increases the rate of almost every reaction.", "At equilibrium, forward rate = backward rate.", "Le Chatelier: the system opposes the change."],
        classwork: [{ q: "Is burning exothermic or endothermic?", a: "Exothermic." }, { q: "Name two ways to speed up the reaction of marble chips with acid.", a: "Crush the chips into smaller pieces (larger surface area), warm the acid, or use more concentrated acid." }, { q: "What does a catalyst do?", a: "It lowers the activation energy so the reaction goes faster, and it is not used up." }],
        assignment: [{ q: "Why does a high pressure favour the formation of ammonia?", a: "There are fewer gas moles on the right side (2) than on the left side (4), so the equilibrium moves to the right to reduce the pressure." }, { q: "Explain why powdered zinc reacts faster with acid than a lump of zinc.", a: "Powder has a much bigger surface area, so more particles are exposed to collisions with the acid." }],
        quiz: [mc("In an exothermic reaction, ΔH is", "negative", "positive", "zero", "infinite"), mc("A catalyst", "lowers the activation energy", "raises the temperature", "is used up", "stops the reaction"), mc("At equilibrium", "the forward and backward rates are equal", "the reaction has stopped completely", "only products are present", "only reactants are present"), mc("Increasing the surface area of a solid reactant", "increases the rate", "decreases the rate", "has no effect", "stops it")],
      },
    ]],
    ["SSS3", [
      {
        title: "Chapter 6 · Organic Chemistry", focus: "Hydrocarbons, alcohols, acids and polymers", label: "Chapter 6",
        scene: sc(["⛽", "🍷", "🛍️"], "#ffe7b3", "#c9e7a5", "Crude oil gives fuels, plastics and medicines."),
        diagram: ALKANES,
        lines: [
          "P|Organic chemistry is the chemistry of carbon compounds. Carbon forms four covalent bonds and can join in chains. A homologous series is a family of compounds with the same general formula and similar properties, each member differing from the next by CH₂.",
          table(["Series", "General formula", "Examples", "Feature"], [["Alkanes", "CₙH₂ₙ₊₂", "methane CH₄, ethane C₂H₆, propane C₃H₈, butane C₄H₁₀", "saturated; single bonds only"], ["Alkenes", "CₙH₂ₙ", "ethene C₂H₄, propene C₃H₆", "unsaturated; one C=C bond"], ["Alkynes", "CₙH₂ₙ₋₂", "ethyne C₂H₂", "one C≡C bond"], ["Alcohols", "CₙH₂ₙ₊₁OH", "methanol, ethanol", "–OH group"], ["Carboxylic acids", "CₙH₂ₙ₊₁COOH", "ethanoic acid", "–COOH group"]]),
          "H|Reactions",
          "R|<ul><li><b>Combustion:</b> CH₄ + 2O₂ → CO₂ + 2H₂O (complete); with little air, carbon monoxide forms (poisonous).</li><li><b>Substitution</b> (alkanes with chlorine in light): CH₄ + Cl₂ → CH₃Cl + HCl.</li><li><b>Addition</b> (alkenes): C₂H₄ + Br₂ → C₂H₄Br₂. Bromine water turns from brown to colourless: this is the test for unsaturation.</li><li><b>Fermentation:</b> C₆H₁₂O₆ → 2C₂H₅OH + 2CO₂ (yeast; makes ethanol).</li><li><b>Esterification:</b> alcohol + carboxylic acid → ester + water (sweet-smelling esters).</li><li><b>Polymerisation:</b> many ethene molecules join to form polyethene, a plastic.</li></ul>",
          ex("Write the formula of the alkane with 6 carbon atoms and the alkene with 4 carbon atoms", ["Alkane: CₙH₂ₙ₊₂ with n = 6 gives C₆H₁₄ (hexane).", "Alkene: CₙH₂ₙ with n = 4 gives C₄H₈ (butene)."]),
          ex("Name the two isomers of C₄H₁₀", ["Butane: CH₃CH₂CH₂CH₃ (a straight chain).", "2-methylpropane: (CH₃)₂CHCH₃ (a branched chain).", "They have the same molecular formula but different structures."]),
          "H|Fractional distillation of crude oil",
          "P|Crude oil is separated by fractional distillation into petroleum gas, petrol, kerosene, diesel, lubricating oil and bitumen. Fractions with small molecules boil at lower temperatures. Large molecules can be cracked into smaller, more useful ones.",
        ],
        devices: ["Alkane CₙH₂ₙ₊₂; alkene CₙH₂ₙ; alkyne CₙH₂ₙ₋₂.", "Alkenes decolourise bromine water; alkanes do not.", "Isomers: same molecular formula, different structures.", "Ethanol is made by fermentation of sugar with yeast.", "Burning fuels in too little air gives carbon monoxide."],
        classwork: [{ q: "Give the molecular formula of propane.", a: "C₃H₈." }, { q: "Which test distinguishes ethene from ethane?", a: "Shake with bromine water: ethene decolourises it; ethane does not." }, { q: "Name the product of fermenting glucose with yeast.", a: "Ethanol (and carbon dioxide)." }],
        assignment: [{ q: "Write the equation for the complete combustion of ethane.", a: "2C₂H₆ + 7O₂ → 4CO₂ + 6H₂O." }, { q: "Explain why crude oil is separated by fractional distillation.", a: "The different hydrocarbons have different boiling points, so they can be separated into fractions by boiling and condensing at different temperatures." }],
        quiz: [mc("The general formula of alkanes is", "CₙH₂ₙ₊₂", "CₙH₂ₙ", "CₙH₂ₙ₋₂", "CₙHₙ"), mc("The test for an alkene is", "bromine water is decolourised", "litmus turns red", "limewater turns milky", "a glowing splint relights"), mc("Ethanol is made from sugar by", "fermentation", "cracking", "distillation of oil", "electrolysis"), mc("Isomers have the same", "molecular formula", "structure", "boiling point", "name")],
      },
      {
        title: "Chapter 7 · Metals, Non-Metals and Industrial Chemistry", focus: "Reactivity, extraction of metals, corrosion and important industrial processes", label: "Chapter 7",
        scene: sc(["⛏️", "🏭", "🔩"], "#e9e0ff", "#c9e7a5", "Metals are extracted according to their reactivity."),
        lines: [
          "P|The reactivity series arranges metals in order: potassium, sodium, calcium, magnesium, aluminium, zinc, iron, lead, (hydrogen), copper, silver, gold. A more reactive metal displaces a less reactive one from its compounds: Zn + CuSO₄ → ZnSO₄ + Cu.",
          "H|Extraction of metals",
          table(["Metal", "Method", "Reason"], [["Potassium, sodium, aluminium", "electrolysis of the molten ore (aluminium from bauxite dissolved in cryolite)", "too reactive to be reduced by carbon"], ["Zinc, iron, lead", "reduction with carbon or carbon monoxide in a furnace", "less reactive than carbon"], ["Gold, silver", "found uncombined or easily separated", "very unreactive"]]),
          ex("State the main reaction in the blast furnace for iron", ["Carbon monoxide reduces iron(III) oxide: Fe₂O₃ + 3CO → 2Fe + 3CO₂.", "Limestone removes sand impurity as slag (calcium silicate)."]),
          "H|Corrosion and alloys",
          "P|Iron rusts when it is in contact with both oxygen and water. Rusting can be prevented by painting, oiling, galvanising (coating with zinc) or making stainless steel. An alloy is a mixture of metals: brass is copper and zinc; steel is iron with a little carbon; bronze is copper and tin.",
          "H|Non-metals and industrial processes",
          "R|<ul><li><b>Haber process:</b> N₂ + 3H₂ ⇌ 2NH₃ (iron catalyst, 450 °C, 200 atm). The ammonia is used to make fertilisers.</li><li><b>Contact process:</b> sulphur burns to SO₂, which with air and a vanadium(V) oxide catalyst gives SO₃, then sulphuric acid: used in batteries, fertilisers and detergents.</li><li><b>Chlor-alkali industry:</b> electrolysis of brine gives chlorine, hydrogen and sodium hydroxide.</li><li><b>Making soap:</b> a fat or oil is boiled with sodium hydroxide (saponification).</li></ul>",
          "H|Water, air and pollution",
          "P|Hard water contains dissolved calcium and magnesium salts: it does not lather easily with soap and forms scale in kettles. Temporary hardness is removed by boiling; permanent hardness by adding washing soda or by ion exchange. Air pollutants include carbon monoxide, sulphur dioxide (acid rain) and oxides of nitrogen. Good practice: do not burn refuse in the open; reduce vehicle fumes.",
        ],
        devices: ["Reactivity: K, Na, Ca, Mg, Al, Zn, Fe, Pb, H, Cu, Ag, Au.", "Reactive metals are extracted by electrolysis; less reactive ones by reduction with carbon.", "Rusting needs oxygen and water.", "Alloys are stronger and more resistant to corrosion than pure metals.", "Haber process makes ammonia; Contact process makes sulphuric acid."],
        classwork: [{ q: "Name the ore of aluminium.", a: "Bauxite." }, { q: "State two conditions needed for iron to rust.", a: "Oxygen (air) and water." }, { q: "Name an alloy of copper and zinc.", a: "Brass." }],
        assignment: [{ q: "Why is aluminium extracted by electrolysis and not by heating with carbon?", a: "Aluminium is more reactive than carbon, so carbon cannot remove the oxygen from aluminium oxide." }, { q: "Describe two ways of preventing rusting.", a: "Painting or oiling the iron; galvanising with zinc; making stainless steel." }],
        quiz: [mc("A more reactive metal will", "displace a less reactive metal from its salt", "never react", "be less dense", "be a non-metal"), mc("Iron is extracted in the", "blast furnace", "contact tower", "electrolytic cell", "Haber reactor"), mc("The Haber process produces", "ammonia", "sulphuric acid", "chlorine", "soap"), mc("Brass is an alloy of copper and", "zinc", "tin", "iron", "carbon")],
      },
    ]],
  ],
  review: [
    mc("The electron arrangement of chlorine is", "2, 8, 7", "2, 8, 8", "2, 7", "2, 8, 1"),
    mc("The number of moles in 22 g of CO₂ is", "0.5", "2", "1", "0.25"),
    mc("A solution that turns phenolphthalein pink is", "alkaline", "acidic", "neutral", "a salt only"),
    mc("In electrolysis, positive ions move to the", "cathode", "anode", "salt bridge", "electrolyte surface"),
    mc("An exothermic reaction", "gives out heat", "absorbs heat", "needs no energy", "stops quickly"),
    mc("The general formula of alkenes is", "CₙH₂ₙ", "CₙH₂ₙ₊₂", "CₙH₂ₙ₋₂", "CₙHₙ₊₂"),
    mc("The metal extracted by electrolysis of molten ore in cryolite is", "aluminium", "iron", "copper", "zinc"),
    mc("Rusting needs", "oxygen and water", "oxygen only", "water only", "nitrogen"),
  ],
});
