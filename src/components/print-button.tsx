"use client";
export function PrintButton({ label = "Print / save as PDF" }: { label?: string }) {
  return <button className="btn btn-primary btn-sm" onClick={() => window.print()}>{label}</button>;
}
