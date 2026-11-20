/** FODAN Basic Science textbook, JSS1–JSS3, following the NERDC Basic Science and Technology curriculum. Original text. */

import type { PoeticWork } from "./poetic-types";
import { mc, sc, ex, fig, t, table, makeBook } from "./book-kit";

const dots = (x0: number, y0: number, cols: number, rows: number, gap: number, jitter = 0) => {
  let s = "";
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) s += `<circle cx="${x0 + c * gap + (jitter ? ((r * 7 + c * 5) % 5) * jitter : 0)}" cy="${y0 + r * gap + (jitter ? ((r * 3 + c * 11) % 5) * jitter : 0)}" r="4.5" fill="#2563eb"/>`;
  return s;
};
const STATES = fig(
  "Particles in a solid, a liquid and a gas",
  `<rect x="15" y="20" width="85" height="85" rx="6" fill="#eff6ff" stroke="#93c5fd"/>${dots(32, 38, 4, 4, 17)}${t(57, 122, "Solid: packed in order", 10)}<rect x="118" y="20" width="85" height="85" rx="6" fill="#eff6ff" stroke="#93c5fd"/>${dots(132, 40, 4, 4, 18, 2)}${t(160, 122, "Liquid: close, move about", 10)}<rect x="221" y="20" width="85" height="85" rx="6" fill="#eff6ff" stroke="#93c5fd"/><circle cx="240" cy="38" r="4.5" fill="#2563eb"/><circle cx="285" cy="50" r="4.5" fill="#2563eb"/><circle cx="256" cy="70" r="4.5" fill="#2563eb"/><circle cx="238" cy="92" r="4.5" fill="#2563eb"/><circle cx="288" cy="90" r="4.5" fill="#2563eb"/>${t(263, 122, "Gas: far apart, free", 10)}`,
  135,
);
const CIRCUIT = fig(
  "A simple series circuit: cell, switch and bulb",
  `<rect x="60" y="30" width="200" height="85" rx="4" fill="none" stroke="#0b1f4b" stroke-width="2.5"/><rect x="40" y="60" width="40" height="26" fill="#f8fafc" stroke="none"/><line x1="52" y1="62" x2="52" y2="84" stroke="#0b1f4b" stroke-width="3"/><line x1="64" y1="70" x2="64" y2="76" stroke="#0b1f4b" stroke-width="3"/>${t(58, 102, "cell", 10)}<rect x="130" y="20" width="60" height="22" fill="#f8fafc" stroke="none"/><line x1="135" y1="36" x2="158" y2="22" stroke="#dc2626" stroke-width="3"/>${t(160, 14, "switch", 10)}<circle cx="260" cy="72" r="14" fill="#fef9c3" stroke="#b45309" stroke-width="2.5"/><line x1="250" y1="62" x2="270" y2="82" stroke="#b45309" stroke-width="2"/><line x1="270" y1="62" x2="250" y2="82" stroke="#b45309" stroke-width="2"/>${t(260, 102, "bulb", 10)}${t(160, 138, "Current flows from the + of the cell, round the loop, back to the −", 9, "middle", "#64748b", 600)}`,
  150,
);
const SOLAR = fig(
  "The Sun and the planets in order from the Sun",
  `<circle cx="28" cy="70" r="22" fill="#fbbf24"/>${[["Mercury", 70, 3], ["Venus", 100, 5], ["Earth", 130, 5.5], ["Mars", 158, 4], ["Jupiter", 197, 12], ["Saturn", 240, 10], ["Uranus", 272, 7], ["Neptune", 300, 7]].map(([n, x, r], i) => `<circle cx="${x}" cy="${70}" r="${r}" fill="${["#9ca3af", "#fcd34d", "#3b82f6", "#ef4444", "#d97706", "#fbbf24", "#67e8f9", "#1d4ed8"][i]}"/>${t(Number(x), i % 2 ? 100 : 48, String(n), 8)}`).join("")}${t(160, 128, "My Very Easy Method Just Speeds Up Naming", 10, "middle", "#64748b", 600)}`,
  140,
);

export const BASIC_SCIENCE_BOOK: PoeticWork = makeBook({
  source: "FODAN Basic Science Textbook JSS1-JSS3",
  title: "FODAN Basic Science · JSS1–JSS3",
  subtitle: "Living things, matter, energy, the body, electricity, acids and the Earth, class by class",
  intro: "This textbook follows the NERDC Basic Science and Technology curriculum for Junior Secondary School. JSS1: living things, matter and energy. JSS2: measurement and force, the human body, and elements, compounds and mixtures. JSS3: electricity and magnetism, acids, bases and salts, and the Earth in space.",
  groups: [
    ["JSS1", [
      {
        title: "Chapter 1 · Living and Non-Living Things", focus: "What makes a thing alive, and how living things are grouped", label: "Chapter 1",
        scene: sc(["🌱", "🐕", "🪨"], "#d9f0ff", "#c9e7a5", "A plant and a dog are alive; a stone is not."),
        lines: [
          "P|Science is the study of the world around us. Living things (organisms) are the plants and animals. Non-living things are rocks, water, air and objects made by people.",
          "H|Seven characteristics of living things",
          table(["Characteristic", "Meaning", "Example"], [["Movement", "change of position or part", "a dog runs; a plant turns to the light"], ["Respiration", "releasing energy from food", "breathing in and out"], ["Sensitivity", "responding to changes (stimuli)", "you pull your hand from a hot pot"], ["Growth", "permanent increase in size", "a seedling grows into a tree"], ["Reproduction", "making new living things like themselves", "a hen lays eggs"], ["Excretion", "removing waste made by the body", "passing urine; sweating"], ["Nutrition", "taking in food", "a goat eats grass; a plant makes its food"]]),
          ex("Is a car a living thing? Give reasons", ["A car moves and uses fuel, but it does not grow, reproduce or respond to its surroundings on its own.", "It does not show all seven characteristics, so a car is not a living thing."]),
          "H|Grouping living things",
          "P|Living things are grouped into plants and animals. Plants make their own food using sunlight and have cell walls. Animals eat other living things and can usually move from place to place. Animals with a backbone are vertebrates: fish, amphibians (frogs), reptiles (lizards), birds and mammals. Animals without a backbone are invertebrates: insects, worms, snails.",
        ],
        devices: ["Seven characteristics of life: movement, respiration, sensitivity, growth, reproduction, excretion, nutrition.", "A living thing shows all of them.", "Plants make their own food; animals eat food.", "Vertebrates have a backbone; invertebrates do not.", "Mammals feed their young with milk and have hair or fur."],
        classwork: [{ q: "Name three characteristics of living things.", a: "Any three of: movement, respiration, sensitivity, growth, reproduction, excretion, nutrition." }, { q: "Give one example of a vertebrate and one of an invertebrate.", a: "Vertebrate: fish (or bird, frog). Invertebrate: an insect or an earthworm." }, { q: "Why is a stone not alive?", a: "It does not grow, feed, breathe or reproduce." }],
        assignment: [{ q: "State how plants and animals get their food.", a: "Plants make their own food by photosynthesis using sunlight. Animals feed on plants or other animals." }, { q: "List the five groups of vertebrates.", a: "Fishes, amphibians, reptiles, birds and mammals." }],
        quiz: [mc("A living thing that has a backbone is a", "vertebrate", "invertebrate", "mineral", "fuel"), mc("Removing waste from the body is", "excretion", "nutrition", "growth", "movement"), mc("Which of these is non-living?", "a stone", "a frog", "a tree", "a bird"), mc("Mammals are animals that", "feed their young with milk", "lay eggs only", "have no backbone", "live only in water")],
      },
      {
        title: "Chapter 2 · Matter and Its States", focus: "Solids, liquids and gases, and how matter changes state", label: "Chapter 2",
        scene: sc(["🧊", "💧", "☁️"], "#d9f0ff", "#c9e7a5", "Ice, water and steam are one substance in three states."),
        diagram: STATES,
        lines: [
          "P|Matter is anything that has mass and takes up space. All matter is made of tiny particles. There are three states of matter: solid, liquid and gas.",
          table(["State", "Shape", "Volume", "Particles"], [["Solid", "fixed", "fixed", "packed closely in a regular pattern, vibrating"], ["Liquid", "takes the shape of its container", "fixed", "close together but able to move past one another"], ["Gas", "fills its container", "not fixed", "far apart and moving quickly in all directions"]]),
          "H|Changes of state",
          "R|<ul><li><b>Melting:</b> solid to liquid (ice melts at 0 °C).</li><li><b>Freezing:</b> liquid to solid.</li><li><b>Boiling / evaporation:</b> liquid to gas (water boils at 100 °C).</li><li><b>Condensation:</b> gas to liquid (water drops on a cold glass).</li><li><b>Sublimation:</b> solid directly to gas (camphor, dry ice).</li></ul>",
          ex("Why do wet clothes dry on a line?", ["The water in the clothes evaporates: particles at the surface gain enough energy to escape as water vapour.", "Warm, dry, windy weather speeds up evaporation, so clothes dry faster."]),
          "H|Physical and chemical changes",
          "P|In a physical change no new substance is formed (melting ice). In a chemical change a new substance is formed and cannot easily be changed back (burning wood, rusting iron, cooking an egg).",
        ],
        devices: ["Solids keep their shape; liquids flow; gases spread to fill space.", "Heating makes particles move faster.", "Melting point of ice: 0 °C. Boiling point of water: 100 °C.", "Physical change: no new substance. Chemical change: new substance.", "Evaporation happens at any temperature, boiling only at the boiling point."],
        classwork: [{ q: "Name the change of state from liquid to gas.", a: "Evaporation (or boiling)." }, { q: "Is burning paper a physical or chemical change?", a: "Chemical: ash and gases are new substances." }, { q: "State one property of gases.", a: "They have no fixed shape or volume and can be compressed." }],
        assignment: [{ q: "Explain why a gas fills its container.", a: "Its particles are far apart and move quickly in all directions, so they spread out until they fill all the space." }, { q: "Give two examples of chemical changes.", a: "Rusting of iron and burning of wood (also cooking, souring of milk)." }],
        quiz: [mc("Ice turning to water is", "melting", "freezing", "condensation", "sublimation"), mc("Particles are far apart in a", "gas", "solid", "liquid", "crystal"), mc("Rusting is a", "chemical change", "physical change", "state change only", "reversible change"), mc("Water boils at", "100 °C", "0 °C", "50 °C", "37 °C")],
      },
      {
        title: "Chapter 3 · Energy", focus: "Forms, sources and conversion of energy", label: "Chapter 3",
        scene: sc(["☀️", "💡", "🔥"], "#ffe7b3", "#c9e7a5", "The Sun is our main source of energy."),
        lines: [
          "P|Energy is the ability to do work. It is measured in joules (J). Energy cannot be created or destroyed; it only changes from one form to another. This is the law of conservation of energy.",
          table(["Form of energy", "Example"], [["Heat (thermal)", "a fire, the Sun"], ["Light", "a lamp, the Sun"], ["Sound", "a drum, a speaker"], ["Electrical", "a battery, NEPA/PHCN supply"], ["Chemical", "food, fuel, batteries"], ["Kinetic", "a moving car"], ["Potential", "water in a dam, a stretched spring"]]),
          "H|Energy conversion",
          ex("State the energy changes in an electric fan and in a torch", ["An electric fan changes electrical energy to kinetic (movement) energy.", "A torch changes chemical energy in the battery to electrical energy and then to light and heat."]),
          "H|Sources of energy",
          "P|Renewable sources can be used again and again: the Sun, wind, flowing water, biomass. Non-renewable sources will run out: coal, crude oil, natural gas. Nigeria uses hydroelectric power from Kainji and Shiroro dams, and natural gas for power stations.",
        ],
        devices: ["Energy is measured in joules (J).", "Energy is never lost; it changes form.", "Kinetic energy is movement; potential energy is stored.", "Renewable: sun, wind, water. Non-renewable: coal, oil, gas.", "Food is a store of chemical energy."],
        classwork: [{ q: "What is energy?", a: "The ability to do work." }, { q: "Name two renewable sources of energy.", a: "The Sun and wind (or water, biomass)." }, { q: "State the energy change in a loudspeaker.", a: "Electrical energy to sound energy." }],
        assignment: [{ q: "Explain why crude oil is called non-renewable.", a: "It took millions of years to form and cannot be replaced once used up." }, { q: "Give the energy change when a plant makes food.", a: "Light energy from the Sun is changed to chemical energy stored in food." }],
        quiz: [mc("The unit of energy is the", "joule", "newton", "metre", "kilogram"), mc("Which is a renewable source?", "wind", "coal", "crude oil", "natural gas"), mc("A battery stores", "chemical energy", "sound energy", "kinetic energy only", "no energy"), mc("Energy cannot be", "created or destroyed", "converted", "measured", "stored")],
      },
    ]],
    ["JSS2", [
      {
        title: "Chapter 4 · Measurement and Force", focus: "Units of measurement, density, weight and the effect of forces", label: "Chapter 4",
        scene: sc(["⚖️", "📏", "🧲"], "#cfe8ff", "#c9e7a5", "Scientists measure so that results can be compared."),
        lines: [
          "P|Measurement gives numbers to physical quantities. The SI (international) units are: length in metres (m), mass in kilograms (kg), time in seconds (s), temperature in kelvin or degrees Celsius, and force in newtons (N).",
          table(["Quantity", "Instrument", "Unit"], [["Length", "metre rule, tape measure", "metre (m)"], ["Mass", "beam balance", "kilogram (kg)"], ["Time", "stopwatch", "second (s)"], ["Volume of liquid", "measuring cylinder", "cm³ or litre"], ["Temperature", "thermometer", "°C"]]),
          "H|Density",
          "P|Density = mass ÷ volume. The unit is g/cm³ or kg/m³.",
          ex("A block has mass 600 g and volume 200 cm³. Find its density", ["Density = mass ÷ volume = 600 ÷ 200.", "Density = 3 g/cm³."]),
          "H|Force and weight",
          "P|A force is a push or a pull. It can start or stop motion, change speed or direction, or change shape. Weight is the force of gravity on a body: weight = mass × g, where g is about 10 N/kg on Earth.",
          ex("Find the weight of a 5 kg bag of rice (g = 10 N/kg)", ["Weight = mass × g = 5 × 10.", "Weight = 50 N."]),
          "H|Friction",
          "P|Friction is the force that opposes motion between surfaces in contact. It helps us to walk and brake, but it also causes wear and wastes energy as heat. Oil and grease reduce friction.",
        ],
        devices: ["SI units: metre, kilogram, second, newton.", "Density = mass ÷ volume.", "Weight = mass × g; weight is measured in newtons, mass in kilograms.", "Friction opposes motion and produces heat.", "A fair test changes one thing at a time."],
        classwork: [{ q: "State the SI unit of mass and of force.", a: "Kilogram (kg) and newton (N)." }, { q: "A stone has mass 150 g and volume 50 cm³. Find the density.", a: "150 ÷ 50 = 3 g/cm³." }, { q: "Name one use and one disadvantage of friction.", a: "Use: it stops us from slipping when we walk. Disadvantage: it wears out machine parts." }],
        assignment: [{ q: "Find the weight of a 12 kg object (g = 10 N/kg).", a: "12 × 10 = 120 N." }, { q: "Why is oil put on the moving parts of a machine?", a: "To reduce friction, which reduces wear and heat." }],
        quiz: [mc("Density is", "mass ÷ volume", "volume ÷ mass", "mass × volume", "weight × volume"), mc("The weight of a 2 kg mass (g = 10 N/kg) is", "20 N", "2 N", "0.2 N", "12 N"), mc("The instrument for measuring time is a", "stopwatch", "beam balance", "thermometer", "ruler"), mc("A force that opposes motion is", "friction", "gravity", "magnetism", "energy")],
      },
      {
        title: "Chapter 5 · The Human Body: Digestion and Breathing", focus: "How food is digested and how we take in oxygen", label: "Chapter 5",
        scene: sc(["🍚", "🫁", "🫀"], "#ffe7e7", "#c9e7a5", "Food and air give the body energy to live."),
        lines: [
          "P|Digestion is the breaking down of food into small, soluble substances that the blood can carry round the body.",
          "H|The path of food",
          "R|<ol><li><b>Mouth:</b> teeth chew the food; saliva starts the digestion of starch.</li><li><b>Gullet (oesophagus):</b> a muscular tube that pushes food to the stomach.</li><li><b>Stomach:</b> digests protein with acid and enzymes.</li><li><b>Small intestine:</b> digestion is completed; digested food is absorbed into the blood.</li><li><b>Large intestine:</b> water is absorbed; the rest is formed into faeces.</li><li><b>Anus:</b> faeces leave the body.</li></ol>",
          table(["Food class", "Use in the body", "Source"], [["Carbohydrates", "energy", "yam, rice, bread"], ["Proteins", "growth and repair", "beans, meat, fish"], ["Fats and oils", "energy store, warmth", "palm oil, groundnut"], ["Vitamins", "protect against disease", "fruits, vegetables"], ["Minerals", "bones, blood", "milk, leafy vegetables"], ["Water", "transport, cooling", "drinks, fruits"]]),
          "H|Breathing",
          "P|We breathe in air through the nose, trachea (windpipe) and bronchi to the lungs. In the tiny air sacs (alveoli), oxygen passes into the blood and carbon dioxide passes out. During inhaling, the ribs move up and out and the diaphragm flattens, so air rushes in. During exhaling the ribs move down and in and the diaphragm arches up, so air is pushed out.",
          ex("Why does the small intestine have a very large surface area?", ["Its inner wall has many tiny finger-like projections called villi.", "A large surface area allows more digested food to be absorbed into the blood quickly."]),
        ],
        devices: ["Food path: mouth, gullet, stomach, small intestine, large intestine, anus.", "Absorption of digested food happens in the small intestine.", "Gas exchange happens in the alveoli of the lungs.", "A balanced diet contains all six classes of food in the right amounts.", "Exhaled air has more carbon dioxide than inhaled air."],
        classwork: [{ q: "Where does digestion of starch begin?", a: "In the mouth, by saliva." }, { q: "Name the gas that enters the blood in the lungs.", a: "Oxygen." }, { q: "Give one source of protein.", a: "Beans (also fish, meat, eggs)." }],
        assignment: [{ q: "Describe what happens to the diaphragm and ribs when you breathe in.", a: "The ribs move up and out and the diaphragm flattens, so the chest becomes bigger and air flows in." }, { q: "What is a balanced diet?", a: "A diet containing all the classes of food (carbohydrates, proteins, fats, vitamins, minerals, water) in the right amounts." }],
        quiz: [mc("Digested food is absorbed mainly in the", "small intestine", "stomach", "mouth", "gullet"), mc("Proteins are needed for", "growth and repair", "energy only", "cooling only", "colour"), mc("Gas exchange takes place in the", "alveoli", "trachea", "gullet", "stomach"), mc("Water is mostly absorbed in the", "large intestine", "mouth", "lungs", "heart")],
      },
      {
        title: "Chapter 6 · Elements, Compounds and Mixtures", focus: "Pure substances, mixtures and how to separate them", label: "Chapter 6",
        scene: sc(["⚗️", "🧂", "🥄"], "#e9e0ff", "#c9e7a5", "Salt dissolved in water is a mixture; pure salt is a compound."),
        lines: [
          "P|An element is a pure substance made of one kind of atom: iron, oxygen, gold, carbon. A compound is a pure substance made of two or more elements chemically joined: water (H₂O), common salt (NaCl), carbon dioxide (CO₂). A mixture contains two or more substances that are not chemically joined, such as sand and water, or air.",
          table(["", "Compound", "Mixture"], [["Made by", "chemical combination", "physical mixing"], ["Composition", "fixed", "can vary"], ["Separation", "by chemical methods", "by physical methods"], ["Properties", "different from its elements", "keep those of the parts"]]),
          "H|Separating mixtures",
          table(["Method", "Used to separate", "Example"], [["Filtration", "an insoluble solid from a liquid", "sand from water"], ["Evaporation", "a dissolved solid from a solution", "salt from salt water"], ["Distillation", "a liquid from a solution", "pure water from salt water"], ["Magnetic separation", "magnetic material from non-magnetic", "iron filings from sand"], ["Decantation", "a liquid from a heavy solid", "water from settled sand"], ["Chromatography", "coloured substances", "inks in a dye"]]),
          ex("How would you obtain salt from a mixture of salt, sand and water?", ["Filter the mixture: the sand stays on the filter paper.", "Evaporate the filtrate (the salt solution) until crystals of salt remain."]),
        ],
        devices: ["Element: one kind of atom. Compound: elements chemically joined.", "Mixtures can be separated by physical methods.", "Filtration removes insoluble solids; evaporation recovers dissolved solids.", "Distillation separates a liquid from a solution.", "Air is a mixture; water is a compound."],
        classwork: [{ q: "Give an example of a compound.", a: "Water (also salt or carbon dioxide)." }, { q: "Which method separates sand from water?", a: "Filtration (or decantation)." }, { q: "Is air an element, a compound or a mixture?", a: "A mixture of gases." }],
        assignment: [{ q: "State two differences between a compound and a mixture.", a: "A compound has a fixed composition and its elements are chemically joined; a mixture has a variable composition and its parts are only mixed and can be separated physically." }, { q: "How can pure water be obtained from sea water?", a: "By distillation: boil the sea water and condense the steam." }],
        quiz: [mc("Iron is a(n)", "element", "compound", "mixture", "solution"), mc("Salt is recovered from salt solution by", "evaporation", "filtration", "magnetism", "decantation"), mc("Water (H₂O) is a", "compound", "element", "mixture", "metal"), mc("A mixture of iron filings and sand can be separated using a", "magnet", "filter paper", "thermometer", "balance")],
      },
    ]],
    ["JSS3", [
      {
        title: "Chapter 7 · Electricity and Magnetism", focus: "Simple circuits, Ohm's law and magnets", label: "Chapter 7",
        scene: sc(["🔋", "💡", "🧲"], "#fff3bf", "#c9e7a5", "A complete circuit lets current flow."),
        diagram: CIRCUIT,
        lines: [
          "P|An electric current is a flow of electric charge round a complete circuit. It is measured in amperes (A). Voltage (potential difference) is the push that drives the current. It is measured in volts (V). Resistance opposes the flow of current. It is measured in ohms (Ω).",
          "P|Ohm's law: V = I × R. So I = V ÷ R and R = V ÷ I.",
          ex("A 12 V battery is connected to a resistor of 4 Ω. Find the current", ["I = V ÷ R = 12 ÷ 4.", "I = 3 A."]),
          "H|Series and parallel circuits",
          table(["", "Series", "Parallel"], [["Path for current", "one path", "more than one path"], ["If one bulb fails", "all go out", "the others keep working"], ["Total resistance", "R = R₁ + R₂", "less than the smallest resistor"], ["Used in", "some decorative lights", "house wiring"]]),
          ex("Two resistors of 2 Ω and 3 Ω are in series. Find the total resistance", ["Add them: 2 + 3 = 5 Ω."]),
          "H|Magnets",
          "P|A magnet attracts iron, steel, nickel and cobalt. Like poles repel; unlike poles attract. A freely hanging magnet points North and South. Electricity can make magnets (electromagnets) when a current flows in a coil wound on an iron core.",
        ],
        devices: ["V = IR; current in amperes, voltage in volts, resistance in ohms.", "Series: one path, resistances add.", "Parallel: branches; the rest keep working if one fails.", "Like poles repel; unlike poles attract.", "Never touch bare wires or sockets with wet hands."],
        classwork: [{ q: "State Ohm's law.", a: "V = I × R: the voltage across a conductor equals the current multiplied by the resistance." }, { q: "Find the current if V = 6 V and R = 3 Ω.", a: "I = 6 ÷ 3 = 2 A." }, { q: "Name three magnetic materials.", a: "Iron, steel, nickel (or cobalt)." }],
        assignment: [{ q: "Find the voltage across a 5 Ω resistor carrying 2 A.", a: "V = IR = 2 × 5 = 10 V." }, { q: "Why are houses wired in parallel?", a: "So that each appliance gets the full voltage and can be switched on or off independently." }],
        quiz: [mc("The unit of resistance is the", "ohm", "ampere", "volt", "watt"), mc("If V = 10 V and R = 5 Ω, then I =", "2 A", "50 A", "5 A", "0.5 A"), mc("Unlike poles of magnets", "attract", "repel", "ignore each other", "melt"), mc("In a series circuit, if one bulb fails, the others", "go out", "get brighter", "stay on", "explode")],
      },
      {
        title: "Chapter 8 · Acids, Bases and Salts", focus: "Testing and using acids and bases", label: "Chapter 8",
        scene: sc(["🍋", "🧼", "🧪"], "#e9e0ff", "#c9e7a5", "Lemon is an acid; soap is a base."),
        lines: [
          "P|Acids taste sour, turn blue litmus red and have a pH below 7. Examples: lemon juice (citric acid), vinegar (ethanoic acid), hydrochloric acid in the stomach. Bases feel soapy, turn red litmus blue and have a pH above 7. A base that dissolves in water is called an alkali: sodium hydroxide, lime water, soap. Neutral substances (pure water) have pH 7.",
          table(["Indicator", "In acid", "In alkali"], [["Litmus", "red", "blue"], ["Methyl orange", "red", "yellow"], ["Phenolphthalein", "colourless", "pink"], ["Universal indicator", "red or orange", "blue or purple"]]),
          "H|Neutralisation",
          "P|When an acid reacts with a base, they neutralise each other, forming a salt and water: acid + base → salt + water.",
          ex("Write the word equation and the formula equation for hydrochloric acid with sodium hydroxide", ["Word equation: hydrochloric acid + sodium hydroxide → sodium chloride + water.", "Formula equation: HCl + NaOH → NaCl + H₂O.", "The salt formed is sodium chloride, common table salt."]),
          "H|Uses",
          "R|<ul><li>Antacid tablets (bases) neutralise excess acid in the stomach.</li><li>Lime (a base) is added to acidic soil.</li><li>Soap-making uses alkalis.</li><li>Car batteries contain sulphuric acid.</li></ul>",
        ],
        devices: ["Acid: pH below 7, sour, turns blue litmus red.", "Base: pH above 7, soapy, turns red litmus blue.", "Neutral: pH 7.", "Acid + base → salt + water.", "Never taste unknown chemicals; wear safety goggles."],
        classwork: [{ q: "What colour does red litmus turn in an alkali?", a: "Blue." }, { q: "State the pH of pure water.", a: "7." }, { q: "Name the products when an acid reacts with a base.", a: "A salt and water." }],
        assignment: [{ q: "Why does a person take an antacid for heartburn?", a: "The antacid is a base that neutralises the excess acid in the stomach." }, { q: "Give two examples of acids found in food.", a: "Citric acid in lemons and ethanoic acid in vinegar." }],
        quiz: [mc("A pH of 3 means the solution is", "acidic", "alkaline", "neutral", "salty"), mc("Acid + base gives", "salt + water", "gas only", "metal + water", "oil"), mc("Blue litmus turns red in", "acid", "alkali", "water", "salt solution"), mc("A pH of 10 shows a(n)", "alkali", "acid", "neutral solution", "salt")],
      },
      {
        title: "Chapter 9 · The Earth and the Solar System", focus: "Day and night, the seasons and the planets", label: "Chapter 9",
        scene: sc(["🌍", "☀️", "🌙"], "#0b1f4b", "#c9e7a5", "The Earth turns once every 24 hours."),
        diagram: SOLAR,
        lines: [
          "P|The Solar System is made up of the Sun, eight planets and their moons, and smaller bodies such as asteroids and comets. The planets in order from the Sun are: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus and Neptune.",
          "H|Rotation and revolution",
          "R|<ul><li><b>Rotation:</b> the Earth spins on its axis once in about 24 hours. This causes <b>day and night</b>.</li><li><b>Revolution:</b> the Earth travels round the Sun once in about 365¼ days. With the tilt of its axis, this causes the <b>seasons</b> in many countries and the length of the year.</li><li>Nigeria has two seasons: the <b>rainy season</b> and the <b>dry season</b> (including the harmattan).</li></ul>",
          "H|The Moon",
          "P|The Moon orbits the Earth about once a month. It shines by reflecting sunlight. We see different shapes (phases) as the Moon's lit side is turned towards or away from us. An eclipse of the Sun happens when the Moon passes between the Earth and the Sun. An eclipse of the Moon happens when the Earth passes between the Sun and the Moon.",
          ex("Why do we have day and night?", ["The Earth is a sphere and the Sun lights only half of it at a time.", "As the Earth rotates, a place moves from the lit side (day) to the dark side (night)."]),
        ],
        devices: ["Rotation: spinning on an axis (day and night).", "Revolution: orbiting the Sun (year).", "The Sun is a star; planets shine by reflected light.", "Planets: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.", "The Moon is Earth's natural satellite."],
        classwork: [{ q: "Name the planet nearest to the Sun.", a: "Mercury." }, { q: "How long does the Earth take to rotate once?", a: "About 24 hours." }, { q: "What causes day and night?", a: "The rotation of the Earth on its axis." }],
        assignment: [{ q: "Distinguish between rotation and revolution.", a: "Rotation is the Earth's spinning on its axis (a day); revolution is its journey round the Sun (a year)." }, { q: "Explain how an eclipse of the Sun happens.", a: "The Moon passes between the Sun and the Earth and blocks the sunlight from part of the Earth." }],
        quiz: [mc("The third planet from the Sun is", "Earth", "Mars", "Venus", "Jupiter"), mc("Day and night are caused by the Earth's", "rotation", "revolution", "tilt only", "moon"), mc("The Earth takes about ___ days to go round the Sun.", "365", "30", "24", "7"), mc("The Moon is a", "satellite of the Earth", "star", "planet", "comet")],
      },
    ]],
  ],
  review: [
    mc("Which is a characteristic of all living things?", "growth", "being green", "having legs", "making sound"),
    mc("Ice turning into water is", "melting", "condensation", "sublimation", "freezing"),
    mc("The density of a block of mass 100 g and volume 50 cm³ is", "2 g/cm³", "0.5 g/cm³", "50 g/cm³", "5 g/cm³"),
    mc("The unit of force is the", "newton", "joule", "kilogram", "watt"),
    mc("Digested food is absorbed in the", "small intestine", "stomach", "mouth", "lungs"),
    mc("If V = 20 V and R = 4 Ω, I =", "5 A", "80 A", "16 A", "0.2 A"),
    mc("A solution of pH 2 is", "acidic", "neutral", "alkaline", "a base"),
    mc("The Earth's rotation causes", "day and night", "eclipses", "the year", "tides only"),
  ],
});
