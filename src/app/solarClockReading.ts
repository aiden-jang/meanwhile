const utcDay = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function solarClockReading(instant: number) {
  const iso = new Date(instant).toISOString();
  const clock = iso.slice(11, 16) + " UTC";
  return { iso, clock, description: `${utcDay.format(instant)} · ${clock}` };
}
