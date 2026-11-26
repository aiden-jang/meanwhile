import stations from "../../sources/observations/recordings/tohoku-waves.json";

export const origin = Date.parse("2011-03-11T05:46:24Z");
export const arrivalWindow = 15 * 60;
export const archiveDuration = 90 * 60;
export const traceWidth = 570;
const sampleSeconds = 5;
const audioFiles = import.meta.glob<string>("../../sources/observations/recordings/*.mp3", {
  eager: true,
  import: "default",
  query: "?url",
});

function waveform(samples: (number[] | null)[], span: number) {
  const peak = Math.max(1, ...samples.flatMap((sample) => sample?.map(Math.abs) ?? []));
  return samples
    .map((sample, index) => {
      if (!sample) return "";
      const x = ((index * sampleSeconds * traceWidth) / span).toFixed(2);
      const top = (50 - (sample[0]! * 42) / peak).toFixed(2);
      const bottom = (50 - (sample[1]! * 42) / peak).toFixed(2);
      return `M${x} ${top}V${bottom}`;
    })
    .join(" ");
}

export const waves = stations.map((station) => ({
  ...station,
  shortName: station.name.split(",")[0]!,
  audio: audioFiles[`../../sources/observations/recordings/${station.id}.mp3`]!,
  arrivalTrace: waveform(station.envelope.slice(0, arrivalWindow / sampleSeconds + 1), arrivalWindow),
  archiveTrace: waveform(station.envelope, archiveDuration),
}));

export type Station = (typeof waves)[number];
export type StationSlot = "first" | "second";

export function reached(station: Station, seconds: number) {
  return station.first !== null && seconds >= station.first;
}

export function amplitudeAt(station: Station, seconds: number) {
  const sample = station.envelope[Math.min(station.envelope.length - 1, Math.floor(seconds / sampleSeconds))];
  return sample ? Math.max(Math.abs(sample[0]!), Math.abs(sample[1]!)) : 0;
}

export function waveTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds) % 60).padStart(2, "0")}`;
}

export function timeAt(seconds: number) {
  return new Date(origin + Math.round(seconds) * 1000).toISOString().slice(11, 19) + " UTC";
}
