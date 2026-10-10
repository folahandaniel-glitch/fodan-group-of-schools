"use client";
import katex from "katex";
import "katex/dist/katex.min.css";
import { useMemo } from "react";

/** Renders plain text with $inline$ and $$display$$ LaTeX via KaTeX. Text is escaped by React. */
export function MathText({ text }: { text: string }) {
  const parts = useMemo(() => {
    const out: { t: "text" | "math"; v: string; display?: boolean }[] = [];
    const re = /\$\$([^$]+)\$\$|\$([^$\n]+)\$/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push({ t: "text", v: text.slice(last, m.index) });
      out.push({ t: "math", v: m[1] ?? m[2], display: m[1] !== undefined });
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push({ t: "text", v: text.slice(last) });
    return out;
  }, [text]);
  return (
    <>
      {parts.map((p, i) => {
        if (p.t === "text") return <span key={i}>{p.v}</span>;
        let html = "";
        try {
          html = katex.renderToString(p.v, { throwOnError: false, displayMode: p.display, output: "html", trust: false });
        } catch {
          return <span key={i}>{p.v}</span>;
        }
        return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </>
  );
}
