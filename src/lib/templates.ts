import { strToU8, zipSync } from "fflate";
import { buildXlsx } from "./xlsx";

/** Starter files staff download, fill in and upload to the library. One template for each allowed file type. */
export const TEMPLATE_EXTS = ["docx", "pptx", "xlsx", "pdf", "mp3"] as const;
export type TemplateExt = (typeof TEMPLATE_EXTS)[number];
export const TEMPLATE_HELP: Record<TemplateExt, string> = {
  docx: "Word document: title page, chapters with objectives, lesson, worked examples, summary and exercises with answers.",
  pptx: "PowerPoint: one slide per idea, with a title, three or four short points and a picture. Maximum 20 slides.",
  xlsx: "Excel: the Instructions sheet explains the layout; the Book data sheet has one row per chapter or exercise.",
  pdf: "PDF: finished, print-ready books and notes. Export it from Word. This template shows the layout to follow.",
  mp3: "Audio: a recorded lesson or story, mono, 64 to 128 kbps, under 4 MB (about 4 to 8 minutes). Name it Subject_Class_Title.mp3.",
};
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const OUTLINE: [string, string][] = [
  ["Title page", "Book title, subject, class level, author and year."],
  ["Chapter 1: (write the chapter title)", ""],
  ["Learning objectives", "Three or four things the learner will be able to do. Start each with a verb: define, list, solve, draw, explain."],
  ["Lesson", "Explain the idea in short paragraphs and plain words. Add a diagram or picture where it helps."],
  ["Worked examples", "Show a full example step by step with the answer."],
  ["Summary", "Five key points to remember."],
  ["Exercises", "Five questions, then a separate section with the answers."],
];

function docx(): Uint8Array {
  const p = (t: string, o: { b?: boolean; sz?: number } = {}) => `<w:p><w:r><w:rPr>${o.b ? "<w:b/>" : ""}<w:sz w:val="${(o.sz ?? 11) * 2}"/></w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`;
  const body = p("TITLE OF THE BOOK", { b: true, sz: 24 }) + p("Subject: ______   Class: ______   Author: ______   Year: ______") + p("") +
    OUTLINE.slice(1).map(([h, d]) => p(h, { b: true, sz: 14 }) + (d ? p(d) : "") + p("(write here)")).join("") + p("Delete the grey guidance lines before you save and upload.");
  return zipSync({
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`),
    "word/document.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`),
  });
}

function xlsx(): Uint8Array {
  return buildXlsx([
    { name: "Instructions", rows: [{ Step: "1", What: "Fill the Book data sheet: one row per chapter or exercise. Do not change the column names." }, { Step: "2", What: "Keep each cell short and clear. Use full sentences in Key points." }, { Step: "3", What: "Save as .xlsx and upload it in Library, Add a book." }] },
    { name: "Book data", columns: ["Chapter", "Topic", "Key points", "Question", "Answer"], rows: [{ Chapter: "1", Topic: "(topic)", "Key points": "(three or four points)", Question: "(question)", Answer: "(answer)" }] },
  ]);
}

function pptx(): Uint8Array {
  const ns = `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"`;
  const xml = (s: string) => strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${s}`);
  const rel = (items: [string, string, string][]) => xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items.map(([id, type, t]) => `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${t}"/>`).join("")}</Relationships>`);
  const sp = (id: number, name: string, y: number, h: number, text: string, sz: number, bold: boolean) => `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="609600" y="${y}"/><a:ext cx="10972800" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr wrap="square"/><a:lstStyle/>${text.split("\n").map((l) => `<a:p><a:r><a:rPr lang="en-GB" sz="${sz}" b="${bold ? 1 : 0}"/><a:t>${esc(l)}</a:t></a:r></a:p>`).join("")}</p:txBody></p:sp>`;
  const slide = (title: string, body: string) => xml(`<p:sld ${ns}><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${sp(2, "Title", 457200, 914400, title, 3600, true)}${sp(3, "Body", 1600200, 4500000, body, 2400, false)}</p:spTree></p:cSld></p:sld>`);
  const clr = (n: string, v: string) => `<a:${n}><a:srgbClr val="${v}"/></a:${n}>`;
  const theme = xml(`<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="School"><a:themeElements><a:clrScheme name="School">${clr("dk1", "000000")}${clr("lt1", "FFFFFF")}${clr("dk2", "0B1F4B")}${clr("lt2", "F8FAFC")}${clr("accent1", "2563EB")}${clr("accent2", "CA8A04")}${clr("accent3", "16A34A")}${clr("accent4", "DC2626")}${clr("accent5", "7C3AED")}${clr("accent6", "0891B2")}${clr("hlink", "2563EB")}${clr("folHlink", "7C3AED")}</a:clrScheme><a:fontScheme name="School"><a:majorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="School"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="28575"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`);
  const tree = `<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>`;
  return zipSync({
    "[Content_Types].xml": xml(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/><Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`),
    "_rels/.rels": rel([["rId1", "officeDocument", "ppt/presentation.xml"]]),
    "ppt/presentation.xml": xml(`<p:presentation ${ns}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rId3"/></p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`),
    "ppt/_rels/presentation.xml.rels": rel([["rId1", "slideMaster", "slideMasters/slideMaster1.xml"], ["rId2", "slide", "slides/slide1.xml"], ["rId3", "slide", "slides/slide2.xml"], ["rId4", "theme", "theme/theme1.xml"]]),
    "ppt/slideMasters/slideMaster1.xml": xml(`<p:sldMaster ${ns}>${tree}<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>`),
    "ppt/slideMasters/_rels/slideMaster1.xml.rels": rel([["rId1", "slideLayout", "../slideLayouts/slideLayout1.xml"], ["rId2", "theme", "../theme/theme1.xml"]]),
    "ppt/slideLayouts/slideLayout1.xml": xml(`<p:sldLayout ${ns} type="blank">${tree}</p:sldLayout>`),
    "ppt/slideLayouts/_rels/slideLayout1.xml.rels": rel([["rId1", "slideMaster", "../slideMasters/slideMaster1.xml"]]),
    "ppt/theme/theme1.xml": theme,
    "ppt/slides/slide1.xml": slide("Title of the lesson", "Subject: ______\nClass: ______\nPresenter: ______"),
    "ppt/slides/slide2.xml": slide("Learning objectives", "1. (first objective)\n2. (second objective)\n3. (third objective)\nOne idea per slide. Three or four short points. Add a picture."),
    "ppt/slides/_rels/slide1.xml.rels": rel([["rId1", "slideLayout", "../slideLayouts/slideLayout1.xml"]]),
    "ppt/slides/_rels/slide2.xml.rels": rel([["rId1", "slideLayout", "../slideLayouts/slideLayout1.xml"]]),
  });
}

function pdf(): Uint8Array {
  const lines = ["BOOK TEMPLATE (PDF)", "", "Write your book in Word using the Word template, then choose File > Save as PDF.", "", ...OUTLINE.flatMap(([h, d]) => [h, d ? "   " + d : ""]), "", "Keep each file under 4 MB. Use clear headings and page numbers."];
  const safe = (s: string) => s.replace(/[()\\]/g, "\\$&").replace(/[^\x20-\x7e]/g, "?");
  const stream = `BT /F1 12 Tf 50 790 Td 16 TL ${lines.map((l) => `(${safe(l)}) Tj T*`).join(" ")} ET`;
  const objs = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>", `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  let out = "%PDF-1.4\n"; const off: number[] = [];
  objs.forEach((o, i) => { off.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${off.map((n) => `${String(n).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
  return strToU8(out);
}

/** About two seconds of valid silent MP3 (MPEG-1 Layer III, 128 kbps, 44.1 kHz) to show the format. Replace it with your recording. */
function mp3(): Uint8Array {
  const frame = new Uint8Array(417); frame.set([0xff, 0xfb, 0x90, 0x00]);
  const out = new Uint8Array(417 * 76);
  for (let i = 0; i < 76; i++) out.set(frame, i * 417);
  return out;
}

export function buildTemplate(ext: TemplateExt): { data: Uint8Array; mime: string } {
  switch (ext) {
    case "docx": return { data: docx(), mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
    case "xlsx": return { data: xlsx(), mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
    case "pptx": return { data: pptx(), mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation" };
    case "pdf": return { data: pdf(), mime: "application/pdf" };
    case "mp3": return { data: mp3(), mime: "audio/mpeg" };
  }
}
