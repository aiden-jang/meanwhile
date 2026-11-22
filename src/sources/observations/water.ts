import type { ObservationData, ObservationSource } from "../../app/observations/types";
import { HOUR, MINUTE, request, utc } from "./common";
import { tidePorts as ports } from "../../app/journeys/coastRoute";
import { riverBasins, riverUnit } from "../../app/observations/riverGauges";
import { spanDeg } from "../../geo/sphere";
import riverReaches from "./river-reaches.json";

const TIDE = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter";
const RIVERS = "https://api.waterdata.usgs.gov/ogcapi/v0/collections";

const TIDE_RANGE = 30;

function tides(input: unknown, key: "data" | "predictions") {
  const rows = (input as Record<string, unknown> | null)?.[key];
  if (!Array.isArray(rows)) return [];
  return rows
    .flatMap(({ t, v }: { t?: string; v?: string }) => {
      const at = typeof t === "string" ? Date.parse(t.replace(" ", "T") + ":00Z") : NaN;
      const value = typeof v === "string" && v.trim() ? Number(v) : NaN;
      return Number.isFinite(at) && Number.isFinite(value) ? [[at, value] as const] : [];
    })
    .sort(([a], [b]) => a - b);
}

export const tide: ObservationSource = {
  options: ports,
  refreshMs: 6 * MINUTE,
  async load(option, signal, restoreAt) {
    const port = ports.find(({ id }) => id === option) ?? ports[0];
    const params = new URLSearchParams({
      station: port.id,
      datum: "MLLW",
      time_zone: "gmt",
      units: "metric",
      format: "json",
      range: String(TIDE_RANGE),
      application: "everythingisfine",
    });
    if (restoreAt !== undefined && restoreAt < Date.now() - 24 * HOUR) {
      params.set(
        "end_date",
        utc(restoreAt + 6 * HOUR)
          .slice(0, 16)
          .replaceAll("-", "")
          .replace("T", " "),
      );
    }
    const [actual, forecast] = await Promise.all([
      request(`${TIDE}?${params}&product=water_level`, signal).then((res) => res.json()),
      request(`${TIDE}?${params}&product=predictions&interval=6`, signal)
        .then((res) => res.json())
        .catch(() => null),
    ]);
    const measured = tides(actual, "data");
    const predictionsAvailable = Array.isArray((forecast as Record<string, unknown> | null)?.["predictions"]);
    const prediction = tides(forecast, "predictions");
    const predictionByTime = new Map(prediction);
    const levels = [...measured, ...prediction].map(([, level]) => level);
    const min = Math.floor(Math.min(0, ...levels));
    const max = Math.ceil(Math.max(min + 1, ...levels));
    const target = { lon: port.lon, lat: port.lat, zoom: 2.7 };
    const frames = measured.map(([at, level]) => {
      const predicted = predictionByTime.get(at);
      const surface = { ...port, lift: Math.max(0, level + 1) * 0.013 };
      return {
        at,
        tide: { observed: level, predicted, min, max },
        paths: [{ points: [port, surface], color: 0x65d3dd }],
        marks: [
          ...ports.map((station) => ({ ...station, size: 9, color: 0x899ab2 })),
          { ...surface, size: 22 + Math.max(0, level) * 7, color: 0x8ae7ef },
        ],
        measurements: [
          { label: "Observed level", value: `${level.toFixed(2)} m` },
          {
            label: "Predicted tide",
            value:
              predicted !== undefined
                ? `${predicted.toFixed(2)} m`
                : predictionsAvailable
                  ? "No prediction for this time"
                  : "Prediction source unavailable",
          },
        ],
      };
    });
    return {
      target,
      frames,
      initial: frames.length - 1,
      units: "m",
      series: [
        { label: "Observed", samples: measured, gapAfter: 6 * MINUTE },
        { label: "Predicted", samples: prediction, gapAfter: 6 * MINUTE },
      ],
      note: "NOAA six-minute observations relative to mean lower low water. The gauge exaggerates height. The dashed trace is the predicted astronomical tide.",
    };
  },
};

async function gauge(
  station: { id: string; label: string },
  start: number,
  end: number,
  signal: AbortSignal,
) {
  const id = `USGS-${station.id}`;
  const query = new URLSearchParams({
    monitoring_location_id: id,
    parameter_code: "00060",
    datetime: `${utc(start)}/${utc(end)}`,
    limit: "450",
    f: "json",
  });
  const [stationData, flow] = await Promise.all([
    request(`${RIVERS}/monitoring-locations/items/${id}?f=json`, signal).then((res) => res.json()),
    request(`${RIVERS}/continuous/items?${query}`, signal).then((res) => res.json()),
  ]);
  const [lon, lat] = (stationData as { geometry?: { coordinates?: number[] } }).geometry?.coordinates ?? [];
  if (lon === undefined || lat === undefined || !Number.isFinite(lon) || !Number.isFinite(lat))
    throw new Error("No gauge position");
  const features =
    (flow as { features?: { properties?: { time?: string; value?: string; unit_of_measure?: string } }[] })
      .features ?? [];
  const samples = features
    .flatMap(({ properties }) => {
      const at = Date.parse(properties?.time ?? "");
      const value = properties?.value?.trim() ? Number(properties.value) : NaN;
      return Number.isFinite(at) && Number.isFinite(value) && properties?.unit_of_measure === "ft^3/s"
        ? [[at, value] as const]
        : [];
    })
    .sort(([a], [b]) => a - b);
  return { lon, lat, ...station, samples, byTime: new Map(samples) };
}

export const river: ObservationSource = {
  options: riverBasins,
  refreshMs: 15 * MINUTE,
  async load(option, signal, restoreAt): Promise<ObservationData> {
    const basin = riverBasins.find(({ id }) => id === option) ?? riverBasins[0];
    const now = Date.now();
    const end = restoreAt !== undefined && restoreAt < now - 24 * HOUR ? restoreAt + 12 * HOUR : now;
    const results = await Promise.allSettled(
      basin.stations.map((station) => gauge(station, end - 24 * HOUR, end, signal)),
    );
    const stations = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
    if (!stations.length) throw new Error("Couldn’t reach either river gauge");
    const times = [...new Set(stations.flatMap(({ samples }) => samples.map(([at]) => at)))].sort(
      (a, b) => a - b,
    );
    const paths = riverReaches.reaches[basin.id].map((line) => ({
      points: line.map(([lon, lat]) => ({ lon: lon!, lat: lat!, lift: 0.01 })),
      color: 0x69bfd4,
      trace: true,
    }));
    const frames = times.map((at) => {
      const gauges = basin.stations.map(({ id, label }) => {
        const station = stations.find((entry) => entry.id === id);
        return { id, label, available: !!station, value: station?.byTime.get(at) };
      });
      return {
        at,
        gauges,
        paths,
        flow: true,
        marks: stations.map(({ id, lat, lon, byTime }) => ({
          id,
          lat,
          lon,
          size: 11,
          color: byTime.has(at) ? 0x89b3bf : 0x899ab2,
        })),
      };
    });
    const first = stations[0]!;
    const last = stations.at(-1)!;
    const span = spanDeg(first.lon, first.lat, last.lon, last.lat);
    const lens = Math.min(48, 11 / Math.max(0.35, span));
    return {
      target: { lon: (first.lon + last.lon) / 2, lat: (first.lat + last.lat) / 2, zoom: 2.8 },
      lens: { globe: lens, map: lens * 2 },
      frames,
      initial: frames.length - 1,
      units: riverUnit,
      series: stations.map(({ id, label, samples }) => ({
        id,
        label,
        samples,
        gapAfter: 15 * MINUTE,
        secondary: id === basin.stations[1].id,
      })),
      note: "Provisional USGS discharge. Both gauges share one chart scale and clock.",
    };
  },
};
