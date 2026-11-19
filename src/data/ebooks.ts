/** Free, openly licensed textbooks and classics the library starts with. Each opens on the publisher's own site. Staff can add more. */
export type EBook = { title: string; author: string; category: string; level: string; url: string; summary: string };
const OS = (slug: string) => `https://openstax.org/details/books/${slug}`;
const GB = (id: number) => `https://www.gutenberg.org/ebooks/${id}`;
const mk = (title: string, author: string, category: string, level: string, url: string, summary: string): EBook => ({ title, author, category, level, url, summary });

export const EBOOKS: EBook[] = [
  mk("Prealgebra 2e", "OpenStax", "Mathematics", "JSS", OS("prealgebra-2e"), "Whole numbers, fractions, decimals, ratios, percent and the first steps of algebra, with worked examples."),
  mk("Elementary Algebra 2e", "OpenStax", "Mathematics", "JSS / SSS 1", OS("elementary-algebra-2e"), "Equations, inequalities, graphs, polynomials and factorising."),
  mk("Intermediate Algebra 2e", "OpenStax", "Mathematics", "SSS", OS("intermediate-algebra-2e"), "Functions, quadratics, exponents, logarithms and sequences."),
  mk("Algebra and Trigonometry 2e", "OpenStax", "Mathematics", "SSS 2 to 3", OS("algebra-and-trigonometry-2e"), "A full SSS course in algebra, trigonometry, series and probability."),
  mk("Precalculus 2e", "OpenStax", "Further Mathematics", "SSS 3", OS("precalculus-2e"), "Functions, vectors, conic sections and the ideas leading to calculus."),
  mk("Calculus Volume 1", "OpenStax", "Further Mathematics", "SSS 3", OS("calculus-volume-1"), "Limits, differentiation and integration."),
  mk("Introductory Statistics 2e", "OpenStax", "Mathematics", "SSS", OS("introductory-statistics-2e"), "Data, averages, probability, distributions and testing ideas."),
  mk("Concepts of Biology", "OpenStax", "Biology", "JSS / SSS 1", OS("concepts-biology"), "Cells, genetics, evolution, ecosystems and the human body in plain language."),
  mk("Biology 2e", "OpenStax", "Biology", "SSS", OS("biology-2e"), "A complete senior biology course with diagrams and review questions."),
  mk("Chemistry 2e", "OpenStax", "Chemistry", "SSS", OS("chemistry-2e"), "Atoms, bonding, reactions, acids and bases, organic chemistry and electrochemistry."),
  mk("College Physics 2e", "OpenStax", "Physics", "SSS", OS("college-physics-2e"), "Motion, forces, energy, waves, electricity, magnetism and modern physics."),
  mk("Astronomy 2e", "OpenStax", "Basic Science", "JSS / SSS", OS("astronomy-2e"), "The solar system, stars, galaxies and the universe."),
  mk("Anatomy and Physiology 2e", "OpenStax", "Biology", "SSS", OS("anatomy-and-physiology-2e"), "The systems of the human body, richly illustrated."),
  mk("Principles of Economics 3e", "OpenStax", "Economics", "SSS", OS("principles-economics-3e"), "Demand and supply, markets, money, trade and development."),
  mk("Principles of Accounting, Volume 1: Financial Accounting", "OpenStax", "Financial Accounting", "SSS", OS("principles-accounting-volume-1-financial-accounting"), "Books of account, ledgers, trial balance and final accounts."),
  mk("Introduction to Business", "OpenStax", "Commerce", "SSS", OS("introduction-business"), "How businesses start, operate, market and finance themselves."),
  mk("Entrepreneurship", "OpenStax", "Business Studies", "SSS", OS("entrepreneurship"), "Ideas, business plans, funding and running a small business."),
  mk("Psychology 2e", "OpenStax", "Social Studies", "SSS", OS("psychology-2e"), "How people think, learn, grow and behave."),
  mk("Writing Guide with Handbook", "OpenStax", "English Language", "SSS", OS("writing-guide"), "Essays, grammar, punctuation, research and clear writing."),
  mk("Pride and Prejudice", "Jane Austen", "Literature in English", "SSS", GB(1342), "A classic novel of manners, family and marriage."),
  mk("Great Expectations", "Charles Dickens", "Literature in English", "SSS", GB(1400), "The story of Pip: ambition, class and conscience."),
  mk("Oliver Twist", "Charles Dickens", "Literature in English", "JSS / SSS", GB(730), "An orphan's journey through the harsh streets of Victorian London."),
  mk("Frankenstein", "Mary Shelley", "Literature in English", "SSS", GB(84), "A scientist's creation and the cost of ambition."),
  mk("Macbeth", "William Shakespeare", "Literature in English", "SSS", GB(1533), "A play about power, guilt and fate."),
  mk("Romeo and Juliet", "William Shakespeare", "Literature in English", "SSS", GB(1513), "A tragedy of young love and family feuds."),
  mk("Treasure Island", "Robert Louis Stevenson", "Reading", "JSS", GB(120), "Pirates, maps and adventure on the high seas."),
  mk("Alice's Adventures in Wonderland", "Lewis Carroll", "Reading", "Primary 4 to JSS", GB(11), "A girl falls into a world of riddles and strange creatures."),
  mk("The Jungle Book", "Rudyard Kipling", "Reading", "Primary 5 to JSS", GB(236), "Mowgli and the animals of the jungle."),
  mk("African Storybook", "African Storybook Initiative", "Reading", "Primary 1 to 4", "https://www.africanstorybook.org", "Hundreds of free illustrated stories for young readers, many in African languages."),
  mk("Siyavula Open Textbooks", "Siyavula", "Mathematics and Science", "JSS / SSS", "https://www.siyavula.com/read", "Free mathematics and science textbooks with practice and worked solutions."),
  mk("CK-12 FlexBooks", "CK-12 Foundation", "Mathematics and Science", "Primary to SSS", "https://www.ck12.org/student/", "Free customisable textbooks, videos and practice across science, mathematics and more."),
  mk("Khan Academy", "Khan Academy", "All subjects", "Primary to SSS", "https://www.khanacademy.org", "Free video lessons and exercises from early mathematics to economics and computing."),
  mk("Wikibooks", "Wikimedia community", "All subjects", "All", "https://en.wikibooks.org", "Open textbooks written and shared by volunteers."),
  mk("Project Gutenberg", "Project Gutenberg", "Reading", "All", "https://www.gutenberg.org", "Over 70,000 free classic books."),
];
