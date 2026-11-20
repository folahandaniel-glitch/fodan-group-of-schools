/** FODAN Social Studies textbook, JSS1–JSS3, following the NERDC Social Studies curriculum. Original text. */

import type { PoeticWork } from "./poetic-types";
import { mc, sc, ex, fig, t, table, makeBook } from "./book-kit";

const COMPASS = fig(
  "The four cardinal points and the points between them",
  `<circle cx="160" cy="72" r="46" fill="#eff6ff" stroke="#93c5fd" stroke-width="2"/><polygon points="160,20 168,72 160,124 152,72" fill="#dc2626" opacity="0.85"/><polygon points="108,72 160,64 212,72 160,80" fill="#1d4ed8" opacity="0.85"/>${t(160, 14, "N", 14)}${t(160, 142, "S", 14)}${t(224, 77, "E", 14)}${t(96, 77, "W", 14)}${t(205, 36, "NE", 10, "middle", "#64748b", 600)}${t(115, 36, "NW", 10, "middle", "#64748b", 600)}${t(205, 118, "SE", 10, "middle", "#64748b", 600)}${t(115, 118, "SW", 10, "middle", "#64748b", 600)}`,
  150,
);
const MAPKEY = fig(
  "Common map symbols and a scale line",
  `<g font-size="11" fill="#0b1f4b" font-weight="700"><rect x="24" y="18" width="14" height="14" fill="#cbd5e1" stroke="#475569"/><text x="48" y="30">Building</text><line x1="24" y1="52" x2="38" y2="52" stroke="#78350f" stroke-width="3"/><text x="48" y="56">Road</text><path d="M24,80 q4,-6 8,0 t8,0" fill="none" stroke="#2563eb" stroke-width="2.5"/><text x="48" y="84">River</text><circle cx="31" cy="106" r="6" fill="#16a34a"/><text x="48" y="110">Forest / trees</text><line x1="190" y1="30" x2="190" y2="60" stroke="#0b1f4b" stroke-width="2"/><polygon points="190,22 184,34 196,34" fill="#0b1f4b"/><text x="207" y="46">North arrow</text><line x1="180" y1="100" x2="260" y2="100" stroke="#0b1f4b" stroke-width="3"/><line x1="180" y1="94" x2="180" y2="106" stroke="#0b1f4b" stroke-width="2"/><line x1="260" y1="94" x2="260" y2="106" stroke="#0b1f4b" stroke-width="2"/><text x="220" y="120" text-anchor="middle">Scale: 1 cm = 10 km</text></g>`,
  135,
);

export const SOCIAL_STUDIES_BOOK: PoeticWork = makeBook({
  source: "FODAN Social Studies Textbook JSS1-JSS3",
  title: "FODAN Social Studies · JSS1–JSS3",
  subtitle: "Environment and maps, the family, culture and peoples, population, trade, transport and social problems, class by class",
  intro: "This textbook follows the NERDC Social Studies curriculum for Junior Secondary School. JSS1: our environment and maps, the family. JSS2: culture and the peoples of Nigeria, population and migration. JSS3: trade, transport and communication, and social problems.",
  groups: [
    ["JSS1", [
      {
        title: "Chapter 1 · Our Environment and How to Read a Map", focus: "Physical and social environment, direction, map symbols and scale", label: "Chapter 1",
        scene: sc(["🗺️", "🧭", "🌳"], "#d9f0ff", "#c9e7a5", "A map is a drawing of a place as seen from above."),
        diagram: COMPASS,
        lines: [
          "P|Our environment is everything around us. The physical environment is made up of natural things: land, water, climate, vegetation and animals. The social environment is made by people: family, school, religion, laws, markets and customs. Social Studies studies how people live with one another and with their environment.",
          "H|Direction",
          "P|The four main (cardinal) points are North, South, East and West. Between them are North-East, South-East, South-West and North-West. The Sun rises in the East and sets in the West. A compass is an instrument that shows direction: its needle points North.",
          "H|Maps",
          "P|A map is a flat drawing of an area of the Earth. A good map has a title, a key (legend) explaining the symbols, a north arrow and a scale. The scale gives the relation between a distance on the map and the real distance.",
          `R|${MAPKEY}`,
          ex("On a map the scale is 1 cm to 10 km. Two towns are 6.5 cm apart. Find the real distance", ["Real distance = 6.5 × 10 km.", "= 65 km."]),
          "H|The regions of Nigeria",
          "P|Nigeria lies in West Africa between latitudes 4° and 14° North. It is bordered by Benin in the west, Niger and Chad in the north, Cameroon in the east and the Atlantic Ocean (Gulf of Guinea) in the south. Its main vegetation belts from south to north: mangrove swamp, rainforest, guinea savanna, sudan savanna and sahel savanna.",
        ],
        devices: ["Cardinal points: N, S, E, W.", "The Sun rises in the East.", "A map needs a title, key, north arrow and scale.", "Physical environment: natural. Social environment: made by people.", "Nigeria's neighbours: Benin, Niger, Chad, Cameroon."],
        classwork: [{ q: "Name the four cardinal points.", a: "North, South, East and West." }, { q: "What does the key of a map explain?", a: "The meaning of the symbols used on the map." }, { q: "Find the real distance if the map distance is 4 cm and the scale is 1 cm to 5 km.", a: "4 × 5 = 20 km." }],
        assignment: [{ q: "Distinguish between the physical and the social environment.", a: "The physical environment is natural (rivers, hills, climate); the social environment is created by people (family, school, markets, laws)." }, { q: "Name four countries that border Nigeria.", a: "Benin, Niger, Chad and Cameroon." }],
        quiz: [mc("The Sun rises in the", "East", "West", "North", "South"), mc("A compass needle points", "North", "East", "West", "South"), mc("The scale of a map shows", "the relation of map distance to real distance", "the height of hills", "the age of towns", "the name of rivers"), mc("Which country borders Nigeria on the west?", "Benin", "Chad", "Ghana", "Cameroon")],
      },
      {
        title: "Chapter 2 · The Family and Marriage", focus: "Kinds of family, roles and the importance of the family", label: "Chapter 2",
        scene: sc(["👨‍👩‍👧‍👦", "🏠", "💞"], "#fff3bf", "#c9e7a5", "The family is the first school of every child."),
        lines: [
          "P|The family is a group of people related by blood, marriage or adoption who usually live together. It is the smallest and most important social group.",
          table(["Type of family", "Members", "Remarks"], [["Nuclear", "father, mother and children", "common in towns and cities"], ["Extended", "nuclear family plus grandparents, uncles, aunts, cousins", "common in Nigerian villages"], ["Single-parent", "one parent and the children", "after death, divorce or separation"], ["Monogamous", "one husband and one wife", "the form allowed by statutory (court) marriage"], ["Polygamous", "a man with more than one wife", "allowed by custom and Islamic law"]]),
          "H|Functions of the family",
          "R|<ul><li>Reproduction and the care of children.</li><li>Socialisation: teaching language, values and customs.</li><li>Provision of food, shelter, clothing and health care.</li><li>Giving love, security and a sense of belonging.</li><li>Passing on the family name, property and religion.</li></ul>",
          "H|Marriage",
          "P|Marriage is the union of a man and a woman as husband and wife. In Nigeria, there are three types: customary marriage (according to the customs of the people), religious marriage (in church or mosque) and statutory (court or registry) marriage under the Marriage Act. Rights and duties in the family: parents provide, guide and discipline; children obey, help with chores and respect elders.",
          ex("Mention two ways in which children can help to keep a happy home", ["They can obey their parents and respect elders.", "They can do chores such as sweeping and washing plates, and avoid quarrelling with their brothers and sisters."]),
        ],
        devices: ["Nuclear: parents and children. Extended: with relatives.", "The family is the first agent of socialisation.", "Types of marriage: customary, religious, statutory.", "Mutual respect keeps a home peaceful.", "Parents' duties: feed, clothe, educate, protect."],
        classwork: [{ q: "Define a family.", a: "A group of people related by blood, marriage or adoption who usually live together." }, { q: "Distinguish between a nuclear and an extended family.", a: "A nuclear family has parents and children only; an extended family also includes other relatives." }, { q: "State two functions of the family.", a: "Care of children and socialisation (teaching values)." }],
        assignment: [{ q: "State three duties of children at home.", a: "Obey parents, help with household chores, and respect elders and siblings." }, { q: "Name the three types of marriage in Nigeria.", a: "Customary, religious and statutory marriage." }],
        quiz: [mc("A family of father, mother and children is", "nuclear", "extended", "polygamous", "royal"), mc("The first agent of socialisation is the", "family", "school", "market", "church"), mc("Marriage in the registry is", "statutory", "customary", "religious", "traditional"), mc("One man married to one wife is", "monogamy", "polygamy", "celibacy", "extended")],
      },
    ]],
    ["JSS2", [
      {
        title: "Chapter 3 · Culture and the Peoples of Nigeria", focus: "What culture is, its elements and Nigeria's major ethnic groups", label: "Chapter 3",
        scene: sc(["🥁", "👘", "🎭"], "#ffe7b3", "#c9e7a5", "Culture is the way of life of a people."),
        lines: [
          "P|Culture is the whole way of life of a people: their language, dress, food, music, dance, religion, values, festivals and ways of governing. It is learnt, shared and passed from one generation to the next.",
          table(["Element of culture", "Examples in Nigeria"], [["Language", "Hausa, Yoruba, Igbo, Ijaw, Efik, Tiv, Kanuri, English (official)"], ["Dress", "agbada, buba and sokoto, iro and buba, babariga, wrapper, george wrapper"], ["Food", "amala, pounded yam, tuwo, jollof rice, eba, ofe onugbu"], ["Festivals", "Durbar (north), Osun-Osogbo, Eyo (Lagos), New Yam festival (Igbo)"], ["Music and dance", "highlife, juju, fuji, afrobeats, the bata and atilogwu dances"], ["Religion", "Islam, Christianity and traditional religions"]]),
          "H|Major ethnic groups",
          "P|There are over 250 ethnic groups in Nigeria. The three largest are the Hausa-Fulani in the north, the Yoruba in the south-west and the Igbo in the south-east. Others include the Ijaw, Kanuri, Tiv, Edo, Ibibio, Nupe and Efik. People of different groups share a common nationality, in which they should respect one another's cultures.",
          "H|Cultural change",
          "P|Culture changes through contact with other peoples, education, religion, trade and the media. Some changes are good (modern medicine); others are harmful (abandoning our languages and good manners). We should protect the good parts of our culture.",
          ex("Why should Nigerians preserve their cultures?", ["Culture gives people identity and pride.", "It passes down good values from one generation to the next.", "Festivals and crafts attract tourists and create income."]),
        ],
        devices: ["Culture is learnt, shared and changing.", "Nigeria has over 250 ethnic groups.", "The three largest groups: Hausa-Fulani, Yoruba and Igbo.", "Ethnic differences should be a source of strength, not conflict.", "Cultural heritage includes language, crafts and festivals."],
        classwork: [{ q: "Define culture.", a: "The whole way of life of a people." }, { q: "Name the three largest ethnic groups in Nigeria.", a: "Hausa-Fulani, Yoruba and Igbo." }, { q: "Give two examples of cultural festivals.", a: "The Durbar and the New Yam festival (also Osun-Osogbo, Eyo)." }],
        assignment: [{ q: "State three elements of culture.", a: "Language, dress, food, music, religion (any three)." }, { q: "Explain how a positive cultural change can be good for a community.", a: "For example, modern medicine reduces disease and saves lives while the people keep their other good customs." }],
        quiz: [mc("The way of life of a people is their", "culture", "climate", "currency", "constitution"), mc("The largest ethnic group in the north is the", "Hausa-Fulani", "Yoruba", "Igbo", "Ijaw"), mc("The Durbar festival is held in the", "north", "south-west", "south-east", "west coast"), mc("Cultural heritage should be", "preserved", "forgotten", "sold", "hidden")],
      },
      {
        title: "Chapter 4 · Population and Migration", focus: "How many people live where, and why they move", label: "Chapter 4",
        scene: sc(["👥", "🏙️", "🚌"], "#d9f0ff", "#c9e7a5", "People move to find work, safety and a better life."),
        lines: [
          "P|Population is the total number of people living in an area. It is counted by a census. Population density is the average number of people per square kilometre: density = population ÷ area.",
          ex("A state has 3,000,000 people and an area of 15,000 km². Find the population density", ["Density = 3,000,000 ÷ 15,000.", "= 200 persons per km²."]),
          "H|Factors affecting population",
          "R|<ul><li><b>Birth rate</b> and <b>death rate</b>: natural increase = birth rate − death rate.</li><li><b>Migration:</b> movement of people from one place to another. Immigration is coming in; emigration is going out.</li><li><b>Fertility, health care and education</b> change the rates.</li></ul>",
          "H|Migration",
          table(["Push factors (reasons for leaving)", "Pull factors (reasons for going)"], [["unemployment and poverty", "jobs and higher pay"], ["war, communal clashes, floods", "peace and safety"], ["poor schools and hospitals", "good schools and hospitals"], ["land shortage", "farmland, towns, electricity"]]),
          "P|Rural-urban migration is the movement of people from villages to towns. It makes cities crowded and short of housing, water and jobs, while villages lose their young workers. Remedy: provide jobs, electricity, water, roads and schools in rural areas.",
        ],
        devices: ["Density = population ÷ area.", "Natural increase = birth rate − death rate.", "Push factors drive people out; pull factors attract them.", "Rural-urban drift causes overcrowding in cities.", "A census counts the population."],
        classwork: [{ q: "Define population density.", a: "The average number of people living in each square kilometre." }, { q: "Find the density of 600 people in 20 km².", a: "600 ÷ 20 = 30 persons per km²." }, { q: "Give one push factor and one pull factor.", a: "Push: unemployment. Pull: better jobs in towns." }],
        assignment: [{ q: "State three effects of rural-urban migration on towns.", a: "Overcrowding, shortage of housing, pressure on water and electricity, unemployment, crime." }, { q: "Suggest two ways to reduce rural-urban migration.", a: "Provide electricity, roads, water, schools and jobs in villages, and support farming." }],
        quiz: [mc("Population density is measured as", "persons per km²", "km per person", "people per year", "naira per person"), mc("Movement of people from villages to towns is", "rural-urban migration", "immigration", "emigration only", "natural increase"), mc("A census is", "a count of the population", "a map", "a festival", "a tax"), mc("Natural increase equals", "birth rate − death rate", "birth rate + death rate", "death rate − birth rate", "migration")],
      },
    ]],
    ["JSS3", [
      {
        title: "Chapter 5 · Trade, Transport and Communication", focus: "How goods and information move", label: "Chapter 5",
        scene: sc(["🚚", "📡", "🛒"], "#ffe7b3", "#c9e7a5", "Trade, roads and phones link people together."),
        lines: [
          "P|Trade is the buying and selling of goods and services. Before money, people practised trade by barter (exchange of goods for goods). Today we use money. Trade within a country is internal (home) trade; trade between countries is external (foreign) trade. Imports are goods brought in; exports are goods sent out. Nigeria's main exports are crude oil and natural gas; cocoa and other agricultural products are also exported.",
          table(["Mode of transport", "Advantages", "Disadvantages"], [["Road", "door-to-door, flexible, cheap for short distances", "accidents, bad roads, slow for bulk goods"], ["Rail", "carries heavy goods cheaply, safe", "fixed routes, few lines in Nigeria"], ["Water", "cheap for bulky goods and for long distances", "slow, depends on ports and rivers"], ["Air", "fastest, good for long distances and perishable goods", "expensive, small loads"], ["Pipeline", "suits oil and gas, continuous", "high cost to build"]]),
          "H|Communication",
          "P|Communication is passing information from one person to another. Traditional means: town criers, drums, smoke signals. Modern means: telephone, mobile phones, radio, television, newspapers, the internet and social media. Good communication speeds up trade, news, learning and emergency help; bad uses include spreading rumours and fake news.",
          "H|Problems of transport in Nigeria",
          "R|<ul><li>Many roads are in bad condition; poor maintenance causes accidents.</li><li>Rail and inland waterways are little used.</li><li>Traffic congestion in cities.</li><li>Overloading, bad driving and failure to obey traffic laws.</li></ul>",
          ex("Which means of transport is best for carrying fresh fish from Port Harcourt to Kano quickly? Give a reason", ["Air or a refrigerated truck.", "Fresh fish spoils quickly, so speed (and cooling) is needed."]),
        ],
        devices: ["Imports come in; exports go out.", "Barter: goods for goods.", "Air transport is fastest; water is cheapest for bulky goods.", "Modern communication: phone, radio, TV, internet.", "Obey road signs and wear seat belts."],
        classwork: [{ q: "Define trade.", a: "The buying and selling of goods and services." }, { q: "Name Nigeria's main export.", a: "Crude oil." }, { q: "State one advantage of air transport.", a: "It is the fastest way to carry people and goods over long distances." }],
        assignment: [{ q: "Distinguish between imports and exports.", a: "Imports are goods bought from other countries; exports are goods sold to other countries." }, { q: "State three problems of road transport in Nigeria.", a: "Bad roads, accidents and traffic congestion (also overloading)." }],
        quiz: [mc("Exchange of goods for goods is", "barter", "export", "credit", "tax"), mc("The fastest means of transport is", "air", "road", "rail", "water"), mc("Goods sent out of a country are", "exports", "imports", "wastes", "gifts"), mc("A modern means of communication is the", "mobile phone", "town crier", "smoke signal", "talking drum")],
      },
      {
        title: "Chapter 6 · Social Problems and Social Issues", focus: "Drug abuse, cultism, HIV/AIDS, child abuse and how to overcome them", label: "Chapter 6",
        scene: sc(["🚫", "🩺", "🤝"], "#fee2e2", "#c9e7a5", "Social problems harm the individual and the community."),
        lines: [
          "P|A social problem is a condition that harms many people in a society and calls for common action. Social problems in Nigeria include drug abuse, cultism, examination malpractice, child abuse, street begging, HIV/AIDS, unemployment, teenage pregnancy, bribery and corruption, and communal conflict.",
          table(["Problem", "Causes", "Effects", "Solution"], [["Drug abuse", "peer pressure, stress, curiosity", "addiction, ill-health, crime", "drug education, counselling, NDLEA"], ["Cultism", "peer pressure, desire for power", "violence, death, school closure", "parental care, school guidance, punishment"], ["Examination malpractice", "laziness, fear of failure", "poor quality graduates", "hard work, strict supervision"], ["Child abuse", "poverty, ignorance", "injury, fear, school dropout", "laws, education, reporting"], ["HIV/AIDS", "unprotected sex, infected needles, mother to child", "weak immunity, death, stigma", "abstinence, faithfulness, testing, treatment, no stigma"]]),
          "H|HIV/AIDS",
          "P|HIV is the virus that causes AIDS by weakening the body's defence. It is spread through unprotected sex, contaminated blood and needles, and from mother to child. It is not spread by touching, hugging, sharing food or mosquito bites. Persons living with HIV should be treated with kindness and given treatment (antiretroviral drugs).",
          ex("A classmate is known to have HIV. How should you treat him?", ["Treat him kindly, as before, because HIV does not spread by sharing a desk or food.", "Do not discriminate or spread rumours.", "Encourage him to continue his treatment."]),
        ],
        devices: ["Say no to drugs, cultism and cheating.", "HIV is not spread by touch or sharing food.", "Child abuse should be reported.", "Education and jobs reduce social problems.", "Peer pressure can be resisted by saying a firm 'no'."],
        classwork: [{ q: "Define a social problem.", a: "A condition that harms many people in a society and needs collective action to solve." }, { q: "Name two ways in which HIV is spread.", a: "Unprotected sex and contaminated needles or blood (also mother to child)." }, { q: "Give two effects of cultism.", a: "Violence and death (also school closure and loss of trust)." }],
        assignment: [{ q: "Suggest three ways of resisting peer pressure.", a: "Know your values, say no firmly, avoid bad company, talk to a trusted adult, choose friends who respect you." }, { q: "State two ways of preventing HIV.", a: "Abstinence and faithfulness to one uninfected partner; avoiding shared needles; screening blood." }],
        quiz: [mc("HIV can be spread by", "contaminated needles", "hugging", "sharing a plate", "mosquito bites"), mc("A solution to examination malpractice is", "hard work and honesty", "bribing", "cheating", "skipping school"), mc("Cultism is", "a social problem", "a good habit", "a subject", "a sport"), mc("A good response to peer pressure is", "say no firmly", "give in", "run away without telling anyone", "copy the group")],
      },
    ]],
  ],
  review: [
    mc("The Sun sets in the", "West", "East", "North", "South"),
    mc("A family of parents and children only is", "nuclear", "extended", "polygamous", "single"),
    mc("The whole way of life of a people is", "culture", "nation", "law", "religion"),
    mc("Population density = population ÷", "area", "birth rate", "years", "number of towns"),
    mc("Goods sent out to other countries are", "exports", "imports", "gifts", "loans"),
    mc("The fastest transport is", "air", "road", "water", "rail"),
    mc("HIV is not spread by", "hugging", "contaminated needles", "unprotected sex", "mother to child"),
    mc("Moving from village to town is called", "rural-urban migration", "emigration", "immigration only", "tourism"),
  ],
});
