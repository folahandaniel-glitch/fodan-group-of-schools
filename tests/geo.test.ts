import { describe, expect, it } from "vitest";
import { distanceM, lateMinutes, parseCoords } from "@/lib/geo";
import { defaultsFor, permits } from "@/lib/logic/permissions";

describe("geo and clock rules", () => {
  it("parses Google Maps coordinates", () => {
    expect(parseCoords("6.5244, 3.3792")).toEqual({ lat: 6.5244, lng: 3.3792 });
    expect(parseCoords("7.3775 3.947")).toEqual({ lat: 7.3775, lng: 3.947 });
    expect(parseCoords("95, 3")).toBeNull();
    expect(parseCoords("abc")).toBeNull();
  });
  it("measures distance in metres", () => {
    expect(distanceM({ lat: 6.5244, lng: 3.3792 }, { lat: 6.5244, lng: 3.3792 })).toBe(0);
    const d = distanceM({ lat: 6.5244, lng: 3.3792 }, { lat: 6.5254, lng: 3.3792 });
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(120);
  });
  it("computes lateness after grace", () => {
    expect(lateMinutes("08:05", "08:00", 10)).toBe(0);
    expect(lateMinutes("08:10", "08:00", 10)).toBe(0);
    expect(lateMinutes("08:25", "08:00", 10)).toBe(25);
  });
  it("gives leaders branch and finance control and staff clock-in", () => {
    expect(permits(defaultsFor("director"), "branches:manage")).toBe(true);
    expect(permits(defaultsFor("premium_admin"), "finance:approve")).toBe(true);
    expect(permits(defaultsFor("teacher"), "clock:create")).toBe(true);
    expect(permits(defaultsFor("teacher"), "branches:manage")).toBe(false);
    expect(permits(defaultsFor("support_staff"), "clock:create")).toBe(true);
    expect(permits(defaultsFor("student"), "clock:create")).toBe(false);
    expect(permits(defaultsFor("headteacher"), "fines:manage")).toBe(true);
  });
});
