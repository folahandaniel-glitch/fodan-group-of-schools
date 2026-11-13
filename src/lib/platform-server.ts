import { getSetting } from "./settings";
import { normalisePlatform, type PlatformState } from "./platform";

export async function getPlatform(): Promise<PlatformState> {
  return normalisePlatform(await getSetting("platform"));
}
