"use client";
import { useState, useTransition } from "react";
import { clock, type ClockResult } from "@/app/(portal)/portal/clock/actions";

export function ClockButtons({ canIn, canOut }: { canIn: boolean; canOut: boolean }) {
  const [msg, setMsg] = useState<ClockResult>({});
  const [pending, start] = useTransition();
  const go = (kind: "in" | "out") => {
    setMsg({});
    if (!navigator.geolocation) return setMsg({ error: "This device cannot provide a location." });
    navigator.geolocation.getCurrentPosition(
      (pos) => start(async () => setMsg(await clock(kind, pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy))),
      () => setMsg({ error: "Location permission was denied. Allow location for this site and try again." }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };
  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <button className="btn btn-primary" disabled={pending || !canIn} onClick={() => go("in")}>Clock in</button>
        <button className="btn btn-gold" disabled={pending || !canOut} onClick={() => go("out")}>Clock out</button>
      </div>
      <p className="mt-3 min-h-6 text-sm font-semibold" role="status">
        {pending ? "Checking your location…" : msg.error ? <span className="text-bad">{msg.error}</span> : msg.ok ? <span className="text-ok">{msg.ok}</span> : null}
      </p>
    </div>
  );
}
