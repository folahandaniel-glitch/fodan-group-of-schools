import { MATHS_JSS, MATHS_SSS } from "./maths-books";
import { ENGLISH_JSS_BOOK, ENGLISH_SSS_BOOK } from "./english-books";
import { BASIC_SCIENCE_BOOK } from "./basic-science-book";
import { BIOLOGY_BOOK } from "./biology-book";
import { PHYSICS_BOOK } from "./physics-book";
import { CHEMISTRY_BOOK } from "./chemistry-book";
import { ECONOMICS_BOOK } from "./economics-book";
import { CIVIC_JSS_BOOK, CIVIC_SSS_BOOK } from "./civic-books";
import { SOCIAL_STUDIES_BOOK } from "./social-studies-book";
import { BASIC_TECHNOLOGY_BOOK } from "./basic-technology-book";
import type { PoeticWork } from "./poetic-types";

/** The illustrated FODAN textbooks and the scheme-of-work subjects and class levels they serve. */
export type Textbook = { key: string; work: PoeticWork; subjects: string[]; levels: number[] };
export const TEXTBOOKS: Textbook[] = [
  { key: "maths-jss", work: MATHS_JSS, subjects: ["Mathematics"], levels: [7, 8, 9] },
  { key: "maths-sss", work: MATHS_SSS, subjects: ["Mathematics", "Further Mathematics"], levels: [10, 11, 12] },
  { key: "english-jss", work: ENGLISH_JSS_BOOK, subjects: ["English Studies"], levels: [7, 8, 9] },
  { key: "english-sss", work: ENGLISH_SSS_BOOK, subjects: ["English Studies", "Literature In English"], levels: [10, 11, 12] },
  { key: "basic-science", work: BASIC_SCIENCE_BOOK, subjects: ["Intermediate Science"], levels: [7, 8, 9] },
  { key: "biology", work: BIOLOGY_BOOK, subjects: ["Biology", "Agricultural Science"], levels: [10, 11, 12] },
  { key: "physics", work: PHYSICS_BOOK, subjects: ["Physics"], levels: [10, 11, 12] },
  { key: "chemistry", work: CHEMISTRY_BOOK, subjects: ["Chemistry"], levels: [10, 11, 12] },
  { key: "economics", work: ECONOMICS_BOOK, subjects: ["Economics", "Commerce"], levels: [10, 11, 12] },
  { key: "civic-jss", work: CIVIC_JSS_BOOK, subjects: ["Social And Citizenship Studies", "Nigerian History"], levels: [7, 8, 9] },
  { key: "civic-sss", work: CIVIC_SSS_BOOK, subjects: ["Citizenship And Heritage Studies", "Government"], levels: [10, 11, 12] },
  { key: "social-studies", work: SOCIAL_STUDIES_BOOK, subjects: ["Social And Citizenship Studies"], levels: [7, 8, 9] },
  { key: "basic-technology", work: BASIC_TECHNOLOGY_BOOK, subjects: ["Digital Technologies", "Technical Drawing"], levels: [7, 8, 9] },
];
