import { NetCDFReader, type Attribute, type Variable } from "netcdfjs";
import type { GeoPoint, ObservationPath, ObservationSource } from "../../app/observations/types";
import { DEG } from "../../geo/sphere";
import { HOUR, request, utc } from "./common";
import jetStream from "./jet-stream.nc?url";

const wrap = (lon: number) => ((lon + 540) % 360) - 180;

function attribute(variable: Variable | undefined, name: string) {
  const attributes: readonly Attribute[] = variable?.attributes ?? [];
  return attributes.find((item) => item.name === name)?.value;
}

function timeOrigin(axis: Variable | undefined) {
  const unit = attribute(axis, "units");
  const epoch = typeof unit === "string" ? /^hours? since (.+)$/i.exec(unit)?.[1] : undefined;
  return Date.parse(epoch ?? "");
}

function vectors(u: number[], v: number[], lons: number[], lats: number[], offset: number) {
  const paths: ObservationPath[] = [];
  let maximum = 0;
  for (let row = 0; row < lats.length; row++) {
    const lat = lats[row]!;
    for (let column = 0; column < lons.length; column++) {
      const lon = wrap(lons[column]!);
      const index = offset + row * lons.length + column;
      const east = u[index]!;
      const north = v[index]!;
      const speed = Math.hypot(east, north);
      if (!Number.isFinite(speed) || speed < 0.5 || speed > 150) continue;
      maximum = Math.max(maximum, speed);
      const scale = Math.min(0.32, 5 / speed);
      const points: GeoPoint[] = Array.from({ length: 4 }, (_, index) => ({
        lon: wrap(lon + (east * scale * index) / (3 * Math.max(0.24, Math.cos(lat * DEG)))),
        lat: Math.min(89, Math.max(-89, lat + (north * scale * index) / 3)),
        lift: 0.004,
      }));
      paths.push({ points, color: speed > 17 ? 0xedbc83 : speed > 9 ? 0x90ddd7 : 0x678ca9 });
    }
  }
  return { paths, maximum };
}

export const wind: ObservationSource = {
  options: [
    { id: "surface", label: "Surface · current forecast" },
    { id: "jet", label: "Jet stream · recorded forecast" },
  ],
  refreshMs: 3 * HOUR,
  async load(option, signal) {
    const jet = option === "jet";
    const response = await request(jet ? jetStream : "/api/observations/wind", signal);
    const grid = new NetCDFReader(await response.arrayBuffer());
    const level = jet ? "isobaric" : "height_above_ground";
    const uName = `u-component_of_wind_${level}`;
    // Unidata appends a number when the collection has several forecast time coordinates.
    const dimension = grid.variables.find(({ name }) => name === uName)?.dimensions[0];
    const time = dimension === undefined ? undefined : grid.dimensions[dimension]?.name;
    const axis = grid.variables.find(({ name }) => name === time);
    if (!axis) throw new Error("Missing forecast time axis");
    const referenceName = axis.name.replace(/^time/, "reftime");
    const reference = grid.variables.find(
      (variable) =>
        variable !== axis &&
        variable.dimensions.length === 1 &&
        variable.dimensions[0] === dimension &&
        (variable.name === referenceName ||
          attribute(variable, "standard_name") === "forecast_reference_time"),
    );
    const origin = timeOrigin(axis);
    const referenceOrigin = timeOrigin(reference);
    const runOrigin = Number.isFinite(referenceOrigin) ? referenceOrigin : origin;
    const field = (name: string) => grid.getDataVariable(name).map(Number);
    const times = field(axis.name);
    const runs = reference ? field(reference.name) : [];
    const lons = field("longitude");
    const lats = field("latitude");
    const u = field(uName);
    const v = field(`v-component_of_wind_${level}`);
    const cells = lons.length * lats.length * times.length;
    if (
      !Number.isFinite(origin) ||
      lons.length < 40 ||
      lats.length < 20 ||
      times.length === 0 ||
      u.length !== cells ||
      v.length !== cells
    )
      throw new Error("Incomplete global wind grid");
    const frames = times
      .map((hour, index) => {
        const at = origin + hour * HOUR;
        const { paths, maximum } = vectors(u, v, lons, lats, index * lons.length * lats.length);
        return {
          at,
          paths,
          flow: true,
          measurements: [
            { label: "Wind level", value: jet ? "250 hPa · upper air" : "10 m above surface" },
            { label: "Fastest sampled wind", value: `${maximum.toFixed(1)} m/s` },
            {
              label: "Model run",
              value: Number.isFinite(runs[index])
                ? utc(runOrigin + runs[index]! * HOUR)
                    .slice(0, 16)
                    .replace("T", " ") + " UTC"
                : "Unavailable",
            },
          ],
        };
      })
      .filter(({ paths }) => paths.length);
    return {
      target: { lon: -45, lat: 25, zoom: 0.91 },
      frames,
      note: `NOAA GFS ${jet ? "recorded upper-air" : "current surface"} forecast via NSF Unidata. Strokes point downwind. Length and colour indicate speed on a sampled grid.`,
    };
  },
};
