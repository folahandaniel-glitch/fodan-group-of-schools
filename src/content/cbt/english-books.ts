/** FODAN English Language textbooks: a JSS part and an SSS part, following the NERDC English Studies curriculum. */
import { makeBook, mc } from "./book-kit";
import { ENGLISH_JSS as J } from "./english-jss";
import { ENGLISH_SSS as S } from "./english-sss";

export const ENGLISH_JSS_BOOK = makeBook({
  source: "FODAN English Language Textbook JSS1-JSS3",
  title: "FODAN English Language · JSS1–JSS3",
  subtitle: "Parts of speech to literature, class by class, with worked examples, exercises and CBT",
  intro: "This textbook follows the NERDC English Studies curriculum for Junior Secondary School. JSS1: parts of speech, sentences and punctuation, comprehension, informal letters. JSS2: tenses and concord, vocabulary, summary, narrative and descriptive essays. JSS3: reported speech and the passive, formal letters, reports and speeches, oral English, and the basics of literature.",
  groups: [
    ["JSS1", [J.parts, J.sentences, J.comprehension, J.informal]],
    ["JSS2", [J.tenses, J.vocab, J.summary, J.narrative]],
    ["JSS3", [J.reported, J.formal, J.oral, J.literature]],
  ],
  review: [
    mc("A word that names a person, place or thing is a", "noun", "verb", "adverb", "conjunction"),
    mc("'Everybody ___ ready.'", "is", "are", "were", "have been"),
    mc("A synonym of 'big' is", "large", "tiny", "thin", "old"),
    mc("A formal letter beginning 'Dear Sir,' ends with", "Yours faithfully,", "Yours lovingly,", "Bye,", "Your friend,"),
    mc("'The wind whispered' is an example of", "personification", "simile", "hyperbole", "rhyme"),
    mc("'He said that he was tired' is", "reported speech", "direct speech", "the passive", "a question"),
    mc("The word 'seat' has the vowel", "/iː/", "/ɪ/", "/e/", "/æ/"),
    mc("A summary should", "keep only the main points", "include every example", "be longer than the passage", "give your opinion"),
  ],
});

export const ENGLISH_SSS_BOOK = makeBook({
  source: "FODAN English Language Textbook SSS1-SSS3",
  title: "FODAN English Language · SSS1–SSS3",
  subtitle: "Comprehension, lexis, summary, essays, oral English and literature for WAEC, NECO and JAMB",
  intro: "This textbook follows the NERDC English Studies curriculum for Senior Secondary School. SSS1: comprehension, lexis and structure, summary, essays. SSS2: clauses and concord, oral English, formal letters, argumentative essays. SSS3: literature-in-English, reports, speeches and articles, registers and examination technique.",
  groups: [
    ["SSS1", [S.comp, S.lexis, S.summary, S.essays]],
    ["SSS2", [S.grammar, S.oral, S.letters, S.argument]],
    ["SSS3", [S.literature, S.reports, S.register]],
  ],
  review: [
    mc("'To break the ice' means to", "start a conversation", "melt something", "end a quarrel", "be cold"),
    mc("An independent clause", "can stand alone", "cannot stand alone", "has no verb", "begins with 'because'"),
    mc("An argumentative essay should", "state a stand and support it", "tell a story only", "describe a place", "list facts without a view"),
    mc("A soliloquy is spoken", "by a character alone on stage", "to the audience in a whisper", "by two characters", "in the audience"),
    mc("'Diagnosis' belongs to the register of", "medicine", "law", "football", "banking"),
    mc("A formal letter beginning 'Dear Mrs Bello,' ends with", "Yours sincerely,", "Yours faithfully,", "Love,", "Cheers,"),
    mc("'Neither the boy nor his friends ___ here.'", "are", "is", "was", "has been"),
    mc("A report is usually written in the", "past tense", "future tense", "imperative", "present continuous"),
  ],
});
