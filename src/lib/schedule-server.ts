import { getSetting } from "./settings";
import { normaliseSchedule, type Schedule } from "./schedule";

/** The school's timetable schedule. Falls back to the standard school day if nothing valid was saved. */
export async function getSchedule(): Promise<Schedule> {
  return normaliseSchedule(await getSetting("schedule"));
}
