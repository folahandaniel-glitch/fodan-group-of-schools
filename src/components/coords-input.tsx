"use client";
import { useState } from "react";

const parse = (v: string) => {
  const m = /(-?\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)/.exec(v);
  if (!m) return null;
  const lat = Number(m[1]), lng = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
};

/** Coordinates field: paste from Google Maps, or stand at the branch and tap "Use my current location". "Check on Google Maps" opens the exact point. */
export function CoordsInput({ name = "coords", defaultValue = "", id = "coords", label = "Coordinates (lat, lng)", onRadius }: { name?: string; defaultValue?: string; id?: string; label?: string; onRadius?: (m: number) => void }) {
  const [value, setValue] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok?: string; error?: string }>({});
  const point = parse(value);

  const locate = () => {
    setNote({});
    if (!navigator.geolocation) return setNote({ error: "This device cannot provide a location. Paste the coordinates from Google Maps instead." });
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setValue(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        setBusy(false);
        setNote({ ok: `Location captured (accurate to about ${Math.round(accuracy)} m).${accuracy > 50 ? " The signal is weak: step outside or wait a moment and tap again for a better reading." : " Check it on Google Maps, then save."}` });
        onRadius?.(Math.round(accuracy));
      },
      (err) => {
        setBusy(false);
        setNote({ error: err.code === 1 ? "Location permission was denied. Allow location for this site in your browser, then try again." : "Your location could not be read. Move to an open area and try again." });
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={name} className="input" value={value} onChange={(e) => setValue(e.target.value)} required inputMode="decimal" placeholder="6.5244, 3.3792" autoComplete="off" />
      <div className="mt-1 flex flex-wrap gap-2">
        <button type="button" className="btn btn-gold btn-sm" onClick={locate} disabled={busy}>{busy ? "Getting location…" : "📍 Use my current location"}</button>
        {point
          ? <a className="btn btn-ghost btn-sm" href={`https://www.google.com/maps?q=${point.lat},${point.lng}`} target="_blank" rel="noopener noreferrer">Check on Google Maps ↗</a>
          : <a className="btn btn-ghost btn-sm" href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer">Open Google Maps ↗</a>}
      </div>
      <p className="hint">Stand inside the branch and tap the gold button, or right-click the spot in Google Maps and paste the numbers.</p>
      {note.ok && <p role="status" className="text-sm font-semibold text-ok">{note.ok}</p>}
      {note.error && <p role="alert" className="text-sm font-semibold text-bad">{note.error}</p>}
    </div>
  );
}
