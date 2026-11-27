import { GroundTransect } from "../earth-stories/survey/GroundTransect";
import { bounds, mapDate, snapshots } from "./lavaTimeline";
import { raster } from "./surveyMap";
import course from "./surveyRoute.json";

const [w, s, e, n] = bounds as [number, number, number, number];
const [sw, se, nw, ne] = raster.corners!;
const geography = course.map(([x, y]) => {
  const u = (x! - w) / (e - w),
    v = (y! - s) / (n - s);
  const coordinate = (axis: "lon" | "lat") =>
    ((1 - u) * sw[axis] + u * se[axis]) * (1 - v) + ((1 - u) * nw[axis] + u * ne[axis]) * v;
  return { lon: coordinate("lon"), lat: coordinate("lat") };
});
export const lavaSurveyDates = course.map((point) => point[2]!);
const middle = geography[Math.floor(geography.length / 2)]!;
export const lavaSurveyTarget = { lon: middle.lon, lat: middle.lat, zoom: 2.4 };

export function LavaTransect({
  index,
  point,
  select,
  compare,
}: {
  index: number;
  point: number;
  select: (point: number) => void;
  compare: () => void;
}) {
  return (
    <GroundTransect
      kind="lava"
      points={geography}
      index={point}
      label="USGS · mapped extent"
      value={mapDate(snapshots[index]!.at)}
      ends={["Fissure 8", "Kapoho Bay"]}
      select={select}
      {...(point === course.length - 1 ? { action: { label: "Compare coast", run: compare } } : {})}
    />
  );
}
