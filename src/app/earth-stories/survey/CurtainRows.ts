import type { GeoPoint } from "../../observations/types";
import type { SurveyFrame } from "../../../globe/surveyProjection";
import { mix, type Row } from "./surface";

export function curtainSample(strips: Row[][], along: number) {
  for (const strip of strips) {
    for (let i = 1; i < strip.length; i++) {
      const a = strip[i - 1]!,
        b = strip[i]!;
      if (along < a.along || along > b.along) continue;
      const t = (along - a.along) / (b.along - a.along);
      return { foot: mix(a.base, b.base, t), tip: mix(a.tip, b.tip, t) };
    }
  }
  return null;
}

export function curtainRows(points: readonly GeoPoint[], frame: SurveyFrame): Row[][] {
  const strips: Row[][] = [];
  let current: Row[] = [];
  const finish = () => {
    if (current.length > 1) strips.push(current);
    current = [];
  };
  for (let i = 0; i < points.length; i++) {
    const { lon, lat } = points[i]!,
      along = i / (points.length - 1);
    const base = frame.face(lon, lat, 0, along),
      tip = frame.face(lon, lat, 1, along);
    if (!base || !tip) {
      finish();
      continue;
    }
    const prev = current.at(-1);
    if (prev && Math.abs(base.x - prev.base.x) > frame.width * 0.55) finish();
    current.push({ base, tip, along });
  }
  finish();
  return strips;
}
