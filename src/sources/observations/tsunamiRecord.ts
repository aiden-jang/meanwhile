import buoys from "./tsunami-readings.json";
import { HOUR, MINUTE, sampleAt } from "./common";

export const tsunamiEpoch = Date.UTC(2010, 1, 27, 6, 34, 11);
export const tsunamiBuoys = buoys.map(({ values, ...buoy }) => ({
  ...buoy,
  label: `DART ${buoy.id} · ${buoy.name}`,
  arrivalAt: tsunamiEpoch + buoy.firstModelHour * HOUR,
  samples: values.map(([seconds, value]) => [tsunamiEpoch + seconds! * 1000, value!] as const),
}));

export function dartReading(buoy: (typeof tsunamiBuoys)[number], at: number) {
  const sample = sampleAt(buoy.samples, at);
  return sample && Math.abs(sample[0] - at) <= 15 * MINUTE ? sample : undefined;
}
