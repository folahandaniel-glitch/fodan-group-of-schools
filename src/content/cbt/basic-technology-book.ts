/** FODAN Basic Technology textbook, JSS1–JSS3, following the NERDC Basic Technology curriculum. Original text. */

import type { PoeticWork } from "./poetic-types";
import { mc, sc, ex, fig, t, table, makeBook } from "./book-kit";

const LINES = fig(
  "Types of line used in technical drawing",
  `<g font-size="11" font-weight="700" fill="#0b1f4b"><line x1="20" y1="24" x2="150" y2="24" stroke="#0b1f4b" stroke-width="3"/><text x="165" y="28">Outline (thick, continuous)</text><line x1="20" y1="50" x2="150" y2="50" stroke="#0b1f4b" stroke-width="1" stroke-dasharray="7 4"/><text x="165" y="54">Hidden detail (dashed)</text><line x1="20" y1="76" x2="150" y2="76" stroke="#0b1f4b" stroke-width="1" stroke-dasharray="12 3 2 3"/><text x="165" y="80">Centre line (chain)</text><line x1="20" y1="102" x2="150" y2="102" stroke="#0b1f4b" stroke-width="1"/><text x="165" y="106">Dimension / construction (thin)</text></g>`,
  125,
);
const GEAR = fig(
  "Two meshing gears: the smaller gear turns faster but with less force",
  `<circle cx="100" cy="72" r="40" fill="#e0e7ff" stroke="#4338ca" stroke-width="3" stroke-dasharray="6 4"/><circle cx="100" cy="72" r="6" fill="#4338ca"/><circle cx="195" cy="72" r="28" fill="#fde68a" stroke="#b45309" stroke-width="3" stroke-dasharray="6 4"/><circle cx="195" cy="72" r="5" fill="#b45309"/>${t(100, 76, "40 teeth", 11, "middle", "#4338ca")}${t(195, 76, "20 teeth", 10, "middle", "#b45309")}${t(160, 134, "Gear ratio = 40 ÷ 20 = 2: the small gear turns twice for each turn of the large one", 9, "middle", "#64748b", 600)}`,
  145,
);

export const BASIC_TECHNOLOGY_BOOK: PoeticWork = makeBook({
  source: "FODAN Basic Technology Textbook JSS1-JSS3",
  title: "FODAN Basic Technology · JSS1–JSS3",
  subtitle: "Workshop safety and tools, technical drawing, materials, building, machines and electricity, class by class",
  intro: "This textbook follows the NERDC Basic Technology curriculum for Junior Secondary School. JSS1: technology, workshop safety and tools, and technical drawing. JSS2: materials, and building construction. JSS3: simple machines and mechanisms, and electrical technology.",
  groups: [
    ["JSS1", [
      {
        title: "Chapter 1 · Technology, Workshop Safety and Hand Tools", focus: "What technology is, safe working habits and common tools", label: "Chapter 1",
        scene: sc(["🔧", "🦺", "🪚"], "#ffe7b3", "#c9e7a5", "Safety first: wear the right clothes and use the right tool."),
        lines: [
          "P|Technology is the use of knowledge, skills, tools and materials to solve problems and meet human needs. Examples: farming tools, building, cooking appliances, telephones and cars. Technology gives us better food, homes, transport and communication, but it can also cause pollution and accidents if it is misused.",
          "H|Safety in the workshop",
          "R|<ul><li>Wear overalls, safety boots, goggles, gloves and a dust mask when needed.</li><li>Keep the floor clean and dry; do not run in the workshop.</li><li>Use a tool only for the job it was made for.</li><li>Keep sharp tools pointed away from your body and carry them with the point down.</li><li>Do not operate a machine without permission.</li><li>Know where the fire extinguisher and the first-aid box are kept.</li><li>Report every accident or injury to the teacher immediately.</li></ul>",
          "H|Common hand tools",
          table(["Tool", "Use"], [["Tape measure and steel rule", "measuring length"], ["Try square", "marking and testing right angles"], ["Hand saw / hacksaw", "cutting wood / cutting metal"], ["Jack plane", "smoothing wood"], ["Chisel and mallet", "cutting joints and grooves in wood"], ["Hammer", "driving nails"], ["Screwdriver", "driving screws"], ["Spanner / pliers", "turning nuts / gripping and cutting wire"], ["Hand drill / brace and bit", "boring holes"], ["Vice", "holding the work firmly"], ["Trowel and spirit level", "spreading mortar / checking level in building"]]),
          ex("Which tool would you use to cut a piece of iron rod, and which for a plank of wood?", ["Iron (metal): a hacksaw, which has fine teeth for metal.", "Wood: a hand saw (rip or tenon saw) with larger teeth."]),
        ],
        devices: ["Technology solves problems and meets needs.", "Always wear protective clothing in the workshop.", "Use each tool only for its purpose.", "Keep cutting edges sharp: a blunt tool is more dangerous.", "Report accidents at once."],
        classwork: [{ q: "Define technology.", a: "The use of knowledge, skills, tools and materials to solve problems and meet human needs." }, { q: "Name two safety clothes worn in a workshop.", a: "Overalls and goggles (also safety boots, gloves)." }, { q: "State the use of a try square.", a: "To mark and test right angles (90°)." }],
        assignment: [{ q: "List five safety rules in a workshop.", a: "Wear protective clothing; keep floors clean; carry sharp tools safely; do not run; do not use a machine without permission." }, { q: "Distinguish between a hand saw and a hacksaw.", a: "A hand saw cuts wood and has larger teeth; a hacksaw cuts metal and has fine teeth." }],
        quiz: [mc("A tool used for testing right angles is the", "try square", "chisel", "plane", "hammer"), mc("A hacksaw is used for cutting", "metal", "wood only", "cloth", "paper"), mc("Goggles protect the", "eyes", "ears", "hands", "feet"), mc("Technology is", "applying knowledge to solve problems", "a type of food", "a game", "only computers")],
      },
      {
        title: "Chapter 2 · Technical Drawing", focus: "Lines, lettering, scales and views", label: "Chapter 2",
        scene: sc(["📐", "✏️", "📏"], "#d9f0ff", "#c9e7a5", "A technical drawing is the language of the builder and the engineer."),
        diagram: LINES,
        lines: [
          "P|A technical (engineering) drawing is an accurate drawing used to show how an object is to be made or built. It uses standard lines, lettering and signs so that anyone who knows them can read it.",
          "H|Drawing instruments",
          "P|Drawing board, T-square, set squares (45° and 30°/60°), pencils (H, HB and 2H), compasses, dividers, protractor, scale rule, eraser and drawing paper (A4, A3, A2 …).",
          "H|Scale",
          "P|Large objects are drawn smaller (reduced), and tiny ones larger (enlarged), using a scale. A scale of 1:5 means that 1 cm on the drawing is 5 cm in real life. Full size is 1:1.",
          ex("A table 1.5 m long is drawn to a scale of 1:10. Find the length on the drawing", ["1.5 m = 150 cm.", "Length on drawing = 150 ÷ 10 = 15 cm."]),
          "H|Views",
          "P|A solid object is shown by views seen from different sides: the front view (elevation), the side view and the top view (plan). Together they form an orthographic projection. A pictorial drawing, such as an isometric drawing, shows the object as it looks, with vertical lines drawn upright and horizontal edges drawn at 30° to the horizontal.",
          ex("A box is 6 cm long, 4 cm wide and 3 cm high. Give the sizes seen in the plan and in the front elevation", ["Plan (from above): length and width, 6 cm by 4 cm.", "Front elevation (from the front): length and height, 6 cm by 3 cm."]),
        ],
        devices: ["Thick lines for outlines; thin lines for dimensions; dashed lines for hidden details.", "Scale 1:5 means the drawing is 5 times smaller.", "Plan = top view; elevation = front view.", "Isometric drawings use 30° lines.", "Keep pencils sharp and the paper clean."],
        classwork: [{ q: "What is the meaning of a scale of 1:2?", a: "Each unit on the drawing represents 2 units of the real object." }, { q: "A line is 24 cm long in real life. Draw it to scale 1:4. How long is the drawing?", a: "24 ÷ 4 = 6 cm." }, { q: "Name the view that is seen from above.", a: "The plan." }],
        assignment: [{ q: "List four drawing instruments.", a: "T-square, set square, compasses and a protractor (also pencil, scale rule, eraser)." }, { q: "A wall 6 m long is drawn to a scale of 1:50. Find its length on the drawing.", a: "6 m = 600 cm. 600 ÷ 50 = 12 cm." }],
        quiz: [mc("A dashed line shows", "hidden detail", "an outline", "a dimension", "a centre"), mc("The view from above is the", "plan", "front elevation", "side elevation", "section"), mc("A scale of 1:10 means the drawing is", "ten times smaller", "ten times larger", "full size", "double size"), mc("An instrument for measuring angles is the", "protractor", "T-square", "compass", "dividers")],
      },
    ]],
    ["JSS2", [
      {
        title: "Chapter 3 · Materials: Wood, Metals, Plastics and Ceramics", focus: "Properties and uses of common engineering materials", label: "Chapter 3",
        scene: sc(["🪵", "🔩", "🧱"], "#ffe7b3", "#c9e7a5", "The choice of material depends on its properties."),
        lines: [
          "P|Materials are the substances from which things are made. They are chosen for their properties: strength, hardness, toughness, elasticity (springing back to shape), ductility (can be drawn into wire), malleability (can be hammered into shape), durability and conductivity.",
          table(["Material", "Examples", "Properties", "Uses"], [["Wood (hardwood)", "iroko, mahogany, teak", "strong, durable, slow growing", "furniture, doors, bridges"], ["Wood (softwood)", "pine, deal", "light, easy to work, less durable", "roof trusses, boxes"], ["Ferrous metals", "cast iron, mild steel, high-carbon steel", "strong; rust if not protected; contain iron", "beams, tools, machine parts"], ["Non-ferrous metals", "aluminium, copper, brass, zinc", "do not rust, ductile or malleable", "wires, roofing sheets, cooking pots"], ["Plastics", "polythene, PVC, bakelite, nylon", "light, waterproof, insulate, easy to mould", "pipes, bags, switches, bottles"], ["Ceramics", "bricks, tiles, glass, porcelain", "hard, brittle, resist heat and chemicals", "building, sanitary ware"], ["Rubber", "natural, synthetic", "elastic, waterproof, insulates", "tyres, boots, seals"]]),
          "H|Wood conversion and seasoning",
          "P|A felled tree is cut into logs and then sawn into planks (conversion). The planks are dried (seasoned) to remove excess water so that they do not warp or crack. Wood can be protected from termites and decay by painting, varnishing or treating with preservatives.",
          "H|Rust and its prevention",
          "P|Iron and steel rust when exposed to water and oxygen. It can be prevented by painting, oiling, galvanising (coating with zinc) or plating with another metal.",
          ex("Why are electric cables made of copper and covered in plastic?", ["Copper is a good conductor of electricity and ductile, so it can be drawn into wire.", "Plastic is an insulator, so it prevents shocks and short circuits."]),
        ],
        devices: ["Hardwood is slow growing, dense and durable.", "Ferrous metals contain iron and rust; non-ferrous metals do not contain iron.", "Plastics insulate; metals conduct.", "Seasoning prevents warping.", "Choose a material for its properties and cost."],
        classwork: [{ q: "Name two hardwoods.", a: "Iroko and mahogany (also teak)." }, { q: "Which property allows a metal to be drawn into wire?", a: "Ductility." }, { q: "State two ways of preventing iron from rusting.", a: "Painting and galvanising (also oiling)." }],
        assignment: [{ q: "Distinguish between ferrous and non-ferrous metals with one example of each.", a: "Ferrous metals contain iron (mild steel) and usually rust; non-ferrous metals do not contain iron (aluminium) and do not rust." }, { q: "Why is wood seasoned before use?", a: "To remove water so that it does not shrink, warp or crack after being made into an article." }],
        quiz: [mc("Which is a non-ferrous metal?", "aluminium", "mild steel", "cast iron", "wrought iron"), mc("Plastic is a good", "insulator", "conductor", "magnet", "fuel"), mc("The drying of wood is called", "seasoning", "conversion", "cutting", "painting"), mc("The ability to be hammered into shape is", "malleability", "ductility", "elasticity", "hardness")],
      },
      {
        title: "Chapter 4 · Building Construction", focus: "From the site to the roof: foundations, walls and roofs", label: "Chapter 4",
        scene: sc(["🏗️", "🧱", "🏠"], "#fff3bf", "#c9e7a5", "A strong building begins with a good foundation."),
        lines: [
          "P|Building is the process of putting up a structure such as a house, school or bridge. The main stages are planning and approval, site clearing and setting out, foundation, walling, roofing, doors and windows, plastering, finishing and painting.",
          "R|<ol><li><b>Site clearing and setting out:</b> remove bush and mark the building positions with pegs and lines.</li><li><b>Foundation:</b> trenches are dug, filled with concrete and a base is built to carry the building's weight.</li><li><b>Walls:</b> built with sandcrete or clay blocks, bricks or stone, laid with mortar in courses.</li><li><b>Roof:</b> a frame of timber (trusses) covered with corrugated sheets, tiles or thatch.</li><li><b>Finishing:</b> plastering, floor screed, painting, fixing doors and windows.</li></ol>",
          "H|Building materials",
          table(["Material", "Use"], [["Cement, sand and water (mortar)", "joining blocks, plastering"], ["Cement, sand, gravel (concrete)", "foundations, columns, slabs"], ["Sandcrete blocks / clay bricks", "walls"], ["Reinforcement (iron rods)", "strengthen concrete"], ["Roofing sheets, tiles, timber", "roofs"]]),
          "H|Mixing concrete",
          "P|Concrete is a mixture of cement, sand (fine aggregate), gravel (coarse aggregate) and water. A common mix by volume is 1:2:4 (1 part cement, 2 parts sand and 4 parts gravel).",
          ex("Find the amount of each material for 14 head-pans of concrete mixed 1:2:4", ["The total parts are 1 + 2 + 4 = 7.", "One part = 14 ÷ 7 = 2 head-pans.", "Cement 2, sand 4, gravel 8 head-pans (total 14)."]),
        ],
        devices: ["Foundation → walls → roof → finishing.", "Concrete mix 1:2:4 = cement : sand : gravel.", "A spirit level checks that work is horizontal; a plumb line checks vertical.", "Reinforced concrete uses iron rods for strength.", "Never mix cement with too much water: it weakens the concrete."],
        classwork: [{ q: "Name the first stage in the construction of a building after site clearing.", a: "Setting out and digging the foundation." }, { q: "What does a spirit level test?", a: "Whether a surface is horizontal (level)." }, { q: "What are the materials in concrete?", a: "Cement, sand, gravel and water." }],
        assignment: [{ q: "Calculate the quantities of cement, sand and gravel in 21 bags of concrete mix 1:2:4.", a: "7 parts: 21 ÷ 7 = 3 each part. Cement 3, sand 6, gravel 12." }, { q: "Why is iron reinforcement used in concrete beams?", a: "Concrete is strong in compression but weak in tension; iron rods carry the tension and prevent cracking." }],
        quiz: [mc("A mortar is a mixture of cement, sand and", "water", "gravel", "paint", "tiles"), mc("The part of a building below the ground is the", "foundation", "roof", "wall", "ceiling"), mc("A plumb line is used to test", "vertical", "horizontal", "angles of 45°", "area"), mc("A concrete mix of 1:2:4 refers to cement : sand :", "gravel", "water", "lime", "paint")],
      },
    ]],
    ["JSS3", [
      {
        title: "Chapter 5 · Simple Machines and Mechanisms", focus: "Levers, pulleys, gears and mechanical advantage", label: "Chapter 5",
        scene: sc(["⚙️", "🔧", "🏗️"], "#e0e7ff", "#c9e7a5", "A machine helps us to do work with less effort."),
        diagram: GEAR,
        lines: [
          "P|A machine is a device that helps us to do work more easily by changing the size or direction of a force. Simple machines: lever, pulley, inclined plane, wheel and axle, screw and wedge. Mechanical advantage (MA) = load ÷ effort. Velocity ratio (VR) = distance moved by effort ÷ distance moved by load. Efficiency = MA ÷ VR × 100%.",
          ex("A crowbar lifts a load of 600 N with an effort of 100 N. Find the mechanical advantage", ["MA = load ÷ effort = 600 ÷ 100.", "MA = 6."]),
          "H|Levers",
          "P|A lever turns about a fixed point, the fulcrum. First-class lever: the fulcrum is between the effort and the load (a see-saw, scissors). Second-class: the load is between the fulcrum and the effort (a wheelbarrow, nutcracker). Third-class: the effort is between the fulcrum and the load (tongs, a fishing rod).",
          "H|Gears",
          "P|Gears are toothed wheels that mesh to transmit motion and force. The gear ratio = number of teeth on the driven gear ÷ number of teeth on the driver. A large driver turning a small gear makes it turn faster; a small driver turning a large gear gives more force but less speed.",
          ex("A driver gear has 20 teeth and the driven gear has 40 teeth. If the driver turns 100 times, how many times does the driven gear turn?", ["Gear ratio = 40 ÷ 20 = 2, so the driven gear turns at half the rate.", "100 ÷ 2 = 50 turns."]),
          "H|Care of machines",
          "P|Machines must be oiled to reduce friction, kept clean, checked regularly and operated only by trained persons.",
        ],
        devices: ["MA = load ÷ effort.", "Efficiency = MA ÷ VR × 100% and is always less than 100%.", "Three classes of lever depend on the positions of the fulcrum, effort and load.", "Gears transmit motion; a bigger driven gear turns slower.", "Oil reduces friction in machines."],
        classwork: [{ q: "Find the MA if the load is 200 N and the effort is 50 N.", a: "200 ÷ 50 = 4." }, { q: "Name the fulcrum of a see-saw.", a: "The point in the middle on which it turns (the pivot)." }, { q: "Give an example of a second-class lever.", a: "A wheelbarrow (also a nutcracker)." }],
        assignment: [{ q: "A machine has MA 4 and VR 5. Find its efficiency.", a: "4 ÷ 5 × 100 = 80%." }, { q: "Why can no machine be 100% efficient?", a: "Some energy is always lost as heat in overcoming friction between moving parts." }],
        quiz: [mc("The pivot point of a lever is the", "fulcrum", "effort", "load", "wheel"), mc("A wheelbarrow is a", "second-class lever", "first-class lever", "third-class lever", "pulley"), mc("MA is", "load ÷ effort", "effort ÷ load", "load × effort", "load − effort"), mc("Oil on moving parts reduces", "friction", "load", "gravity", "mass")],
      },
      {
        title: "Chapter 6 · Electrical Technology and Safety", focus: "Circuits, conductors, insulators, fuses and safe use of electricity", label: "Chapter 6",
        scene: sc(["⚡", "🔌", "💡"], "#fff3bf", "#c9e7a5", "Electricity is useful, but it can kill: respect it."),
        lines: [
          "P|Electricity is a form of energy produced by the movement of electric charges (electrons). It is generated in power stations from water (hydroelectric), gas (thermal), the Sun (solar) or wind, transmitted by high-voltage lines on pylons and supplied to homes at 220–240 V. A conductor allows electricity to pass (copper, aluminium, iron). An insulator does not (plastic, rubber, glass, dry wood).",
          "R|<ul><li>Current (I) is measured in amperes (A); voltage (V) in volts (V); resistance (R) in ohms (Ω).</li><li>Ohm's law: V = I × R.</li><li>Power (P) in watts: P = V × I.</li></ul>",
          ex("An electric iron takes a current of 5 A from a 220 V supply. Find its power", ["P = V × I = 220 × 5.", "P = 1,100 W."]),
          "H|Circuits and house wiring",
          "P|A circuit is a complete path for electric current. In house wiring, sockets and lights are connected in parallel, so that each works independently. A switch is placed in the live wire. The three wires in a plug are: live (brown), neutral (blue) and earth (green and yellow). A fuse is a thin wire that melts and breaks the circuit when the current is too large; a circuit breaker does the same job and can be reset.",
          "H|Electrical safety",
          "R|<ul><li>Do not touch bare wires, sockets or switches with wet hands.</li><li>Switch off and unplug before repairing an appliance.</li><li>Do not overload sockets with many appliances.</li><li>Use the correct fuse rating and earth all metal appliances.</li><li>Keep children away from sockets and fallen power lines.</li><li>In case of an electric shock, switch off at the main switch (or use a dry wooden stick to push the victim free) before helping him or her; then get medical help.</li></ul>",
        ],
        devices: ["Conductors: metals. Insulators: plastic, rubber, glass.", "V = IR; P = VI.", "Brown = live, blue = neutral, green/yellow = earth.", "A fuse protects against overload.", "Never use water on an electrical fire."],
        classwork: [{ q: "Give two examples of conductors and two of insulators.", a: "Conductors: copper and iron. Insulators: plastic and rubber." }, { q: "Find the power if V = 240 V and I = 2 A.", a: "480 W." }, { q: "What is the use of a fuse?", a: "It melts and breaks the circuit if the current is too large, protecting the appliance and the wiring." }],
        assignment: [{ q: "State five safety rules on the use of electricity at home.", a: "Do not touch bare wires with wet hands; switch off before repairs; do not overload sockets; use correct fuses; keep children away from sockets." }, { q: "Explain why household appliances are wired in parallel.", a: "Each appliance receives the full voltage and can be switched on or off without affecting the others." }],
        quiz: [mc("An insulator is", "rubber", "copper", "iron", "aluminium"), mc("The colour of the earth wire is", "green and yellow", "brown", "blue", "red"), mc("The unit of electric current is the", "ampere", "volt", "ohm", "watt"), mc("A fuse", "melts when the current is too large", "increases voltage", "stores energy", "is a switch")],
      },
    ]],
  ],
  review: [
    mc("The tool used for cutting metal is the", "hacksaw", "hand saw", "plane", "chisel"),
    mc("A dashed line in a technical drawing shows", "hidden detail", "outline", "centre line", "dimension"),
    mc("A scale of 1:5 means the drawing is", "five times smaller", "five times larger", "full size", "double size"),
    mc("A hardwood is", "iroko", "pine", "plastic", "aluminium"),
    mc("A concrete mix of 1:2:4 contains how many parts altogether?", "7", "6", "8", "24"),
    mc("A fulcrum is the", "pivot of a lever", "load", "effort", "gear"),
    mc("Brown wire in a plug is", "live", "neutral", "earth", "ground only"),
    mc("An electric kettle takes 10 A at 240 V. Its power is", "2,400 W", "250 W", "24 W", "230 W"),
  ],
});
