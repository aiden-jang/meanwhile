import profile from "./aloha-profile.json";

import { alohaStation, underwaterStart } from "./pacificMoment";
export const source = "https://ftp.soest.hawaii.edu/hot/ctd/hot-355/h355a0203.ctd";
export const deepestPressure = 4802;
export const formatReading = new Intl.NumberFormat("en-US");

export const clamp = (value: number) => Math.min(1, Math.max(0, value));
export const mix = (start: number, end: number, fraction: number) => start + (end - start) * fraction;
export function ease(from: number, to: number, value: number) {
  const fraction = clamp((value - from) / (to - from));
  return fraction * fraction * (3 - 2 * fraction);
}

// UNESCO 1983 standard-ocean pressure-to-depth conversion at Station ALOHA.
export function depthAtPressure(pressure: number) {
  const sineSquared = Math.sin((alohaStation.lat * Math.PI) / 180) ** 2;
  const gravity = 9.780318 * (1 + (0.0052788 + 0.0000236 * sineSquared) * sineSquared) + 1.092e-6 * pressure;
  return (
    ((((-1.82e-15 * pressure + 2.279e-10) * pressure - 2.2512e-5) * pressure + 9.72659) * pressure) / gravity
  );
}

export function readingAt(pressure: number) {
  const next = profile.findIndex(([sample]) => sample >= pressure);
  if (next < 1) return profile[Math.max(0, next)];
  const previous = profile[next - 1];
  const sample = profile[next];
  return pressure - previous[0] < sample[0] - pressure ? previous : sample;
}

export function profilePoint(pressure: number, temperature: number) {
  return [46 + (temperature / 28) * 230, 30 + (pressure / deepestPressure) * 144];
}

export const profileLine = profile
  .map(([pressure, temperature]) => profilePoint(pressure, temperature).join(","))
  .join(" ");

export const castTrace = profile.map(([pressure, temperature]) => [temperature, depthAtPressure(pressure)]);

export function alohaReading(position: number) {
  const pressure = deepestPressure * clamp((position - underwaterStart) / (1000 - underwaterStart)) ** 1.42;
  const meters = depthAtPressure(pressure);
  const depth = formatReading.format(Math.round(meters / 10) * 10);
  return { reading: readingAt(pressure), depth, meters };
}
