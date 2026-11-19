"use client";
import { useRef, useState } from "react";

/** Picks a picture and shrinks it in the browser to 5 KB or less before it is sent. The server checks again. */
async function shrink(file: File, max = 5000): Promise<File | null> {
  const img = await createImageBitmap(file).catch(() => null);
  if (!img) return null;
  for (const side of [240, 200, 168, 144, 120, 96, 72, 56]) {
    const c = document.createElement("canvas"); c.width = side; c.height = side;
    const g = c.getContext("2d"); if (!g) return null;
    g.fillStyle = "#fff"; g.fillRect(0, 0, side, side);
    const s = Math.min(img.width, img.height), sx = (img.width - s) / 2, sy = (img.height - s) / 2;
    g.drawImage(img, sx, sy, s, s, 0, 0, side, side);
    for (const q of [0.72, 0.55, 0.42, 0.3, 0.2]) {
      const blob: Blob | null = await new Promise((r) => c.toBlob(r, "image/jpeg", q));
      if (blob && blob.size <= max) return new File([blob], "photo.jpg", { type: "image/jpeg" });
    }
  }
  return null;
}

export function PhotoField({ current }: { current: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(current ? `/api/files/${current}` : null);
  const [note, setNote] = useState("");
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setNote("Shrinking the picture…");
    const small = await shrink(f);
    if (small && input.current) {
      const dt = new DataTransfer(); dt.items.add(small); input.current.files = dt.files;
      setPreview(URL.createObjectURL(small)); setNote(`Ready: ${(small.size / 1024).toFixed(1)} KB (large pictures are shrunk automatically).`);
    } else setNote("The picture will be shrunk when you save.");
  }
  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {preview ? <img src={preview} alt="Your picture" className="h-28 w-28 rounded-2xl border border-line object-cover" /> : <div className="flex h-28 w-28 items-center justify-center rounded-2xl border-2 border-dashed border-line text-xs text-muted">No picture</div>}
      <div className="min-w-0 flex-1">
        <label htmlFor="photo" className="font-semibold">Your picture <span className="text-bad">*</span></label>
        <input ref={input} id="photo" name="photo" type="file" accept="image/*" onChange={pick} className="input mt-1" />
        <p className="mt-1 text-xs text-muted">A clear face picture. Maximum 5 KB: anything bigger is compressed for you. {note}</p>
      </div>
    </div>
  );
}
