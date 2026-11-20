/** Shapes used by the FODAN textbooks. Copied for the school portal; the originals stay untouched in the Fodan CBT project. */
export interface Scene { emojis: string[]; sky: string; ground: string; caption: string }
export interface PoeticUnit {
  title: string; focus: string; label: string; scene: Scene; diagram?: string;
  /** Line codes: "H|heading", "P|paragraph", "R|trusted HTML (tables, worked examples)", "N|note". */
  lines: string[]; devices: string[];
  classwork: { q: string; a: string }[]; assignment: { q: string; a: string }[]; quiz: { q: string; options: string[]; a: string }[];
}
export interface PoeticWork {
  kind?: "EBOOK" | "STORY"; notesTitle?: string; source: string; title: string; subtitle: string; introHtml: string;
  units: PoeticUnit[]; review: { q: string; options: string[]; a: string }[];
}
