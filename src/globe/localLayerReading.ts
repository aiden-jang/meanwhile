import { windAt, windBearing } from "../geo/windGrid";
import { auroraAt, type Aurora } from "../sources/aurora";
import type { MapLayerPresentation } from "../app/weatherLayers";
import type { Controls } from "./controlsTypes";
import { liveLayerView, type GlobePresentation } from "./presentationMode";
import { placeSceneCue, sceneCueBounds } from "./sceneCueBounds";

type Point = { lon: number; lat: number };
type Sample = Point & { label: string; note: string; radius: number };
const time = (at: number, seconds = false) =>
  new Date(at).toISOString().slice(11, seconds ? 19 : 16) + " UTC";

function read(layers: MapLayerPresentation, point: Point, aurora: Aurora | null): Sample | null {
  const frame = layers.observation?.frame;
  if (layers.reading === "wind" && frame?.windGrid) {
    const w = windAt(frame.windGrid, point.lon, point.lat);
    if (w)
      return {
        ...point,
        radius: 1.004,
        label:
          w.speed < 0.5
            ? "Below 0.5 m/s"
            : `${w.speed.toFixed(1)} m/s toward ${windBearing(w.east, w.north)}`,
        note: "GFS forecast · " + time(frame.at),
      };
  }
  if (layers.reading === "aurora" && aurora) {
    const lon = Math.round(point.lon),
      lat = Math.round(point.lat);
    return {
      lon,
      lat,
      radius: 1.005,
      label: auroraAt(aurora, lon, lat) + "% aurora probability",
      note: aurora.estimatedTime ? "NOAA forecast" : "NOAA forecast · " + time(aurora.forecastAt),
    };
  }
  if (layers.reading === "lightning" && frame?.lightningAt !== undefined && frame.marks?.length) {
    let nearest = frame.marks[0]!,
      best = Infinity;
    const cos = Math.cos((point.lat * Math.PI) / 180);
    for (const mark of frame.marks) {
      const x = (((mark.lon - point.lon + 540) % 360) - 180) * cos;
      const y = mark.lat - point.lat;
      if (x * x + y * y < best) {
        best = x * x + y * y;
        nearest = mark;
      }
    }
    return {
      ...nearest,
      radius: 1 + (nearest.lift ?? 0.012),
      label: "Detected flash",
      note: "GOES-East scan · " + time(frame.lightningAt, true),
    };
  }
  return null;
}

export function createLocalLayerReading(canvas: HTMLCanvasElement, controls: Controls) {
  const node = canvas.parentElement?.querySelector<HTMLElement>("[data-field-reading]");
  const label = node?.querySelector("strong"),
    note = node?.querySelector("small");
  let prior: MapLayerPresentation | null = null,
    grid: Aurora | null = null;
  let lastLon = Infinity,
    lastLat = Infinity,
    sample: Sample | null = null;
  return (mode: GlobePresentation, aurora: Aurora | null, box: DOMRect, obscured: boolean) => {
    if (!node || !label || !note) return;
    const layers = liveLayerView(mode);
    const pose = controls.state();
    if (!layers?.reading || layers.base || pose.zoom < 2.35 || obscured) {
      if (!node.hidden) node.hidden = true;
      return;
    }
    if (
      layers !== prior ||
      aurora !== grid ||
      Math.abs(lastLon - pose.lon) > 0.035 ||
      Math.abs(lastLat - pose.lat) > 0.035
    ) {
      prior = layers;
      grid = aurora;
      lastLon = pose.lon;
      lastLat = pose.lat;
      sample = read(layers, pose, aurora);
    }
    const anchor = sample && controls.project(sample.lon, sample.lat, sample.radius, box);
    const bounds = sceneCueBounds(canvas, box);
    const visible = !!(sample && anchor && bounds.fits(anchor, 75, 60, 8));
    if (node.hidden === visible) node.hidden = !visible;
    if (!visible || !sample || !anchor) return;
    if (label.textContent !== sample.label) label.textContent = sample.label;
    if (note.textContent !== sample.note) note.textContent = sample.note;
    if (node.dataset.fieldReading !== layers.reading) node.dataset.fieldReading = layers.reading;
    placeSceneCue(node, anchor);
  };
}
