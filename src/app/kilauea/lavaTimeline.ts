import data from "./kilauea.json";

export const { bounds, sharedCoast, formerCoast, land, vent, fissures, snapshots, overflight } = data;
export const LAST = snapshots.length - 1;
export const OCEAN_ENTRY = snapshots.findIndex(({ at }) => at.startsWith("2018-06-04T22:00"));
export const COAST_COMPARISON = 48;
export const kapohoBay: [number, number] = [9630, 2049];

export function shorelineTime(percent: number) {
  if (percent === 0) return "Before the eruption";
  if (percent === 100) return "August 9 coastline";
  return `Shoreline divider at ${percent}%`;
}

export function lavaChapter(index: number) {
  if (index < 2) return "Fissure 8 reopens";
  if (index < OCEAN_ENTRY) return "Across lower Puna";
  return index === OCEAN_ENTRY ? "Lava reaches Kapoho Bay" : "The lava delta grows";
}
const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "Pacific/Honolulu",
});

export function mapDate(at: string) {
  return `${dateFormat.format(new Date(at))} · ${at.slice(11, 16)} HST`;
}
