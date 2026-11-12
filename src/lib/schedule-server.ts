import { getSetting } from "./settings";
import { buildPeriods, normaliseSchedule, type Period, type Schedule } from "./schedule";

/** The school's timetable schedule with its periods worked out. Falls back to the default day if nothing was set. */
export async function getSchedule(): Promise<{ schedule: Schedule; periods: Period[] }> {
  const schedule = normaliseSchedule(await getSetting("schedule"));
  return { schedule, periods: buildPeriods(schedule) };
}
