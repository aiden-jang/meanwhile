import { ZOOM_MAX, ZOOM_MIN } from "../../globe/framing";
import { readVisit } from "../visitor/library";
import { journeys } from "./catalogue";
import type { ConnectedStop } from "./connectedStops";

export const journeyProgressKey = "journey-progress-v1";

export interface JourneyProgress {
  id: string;
  step: number;
  stops: [number, ConnectedStop][];
}

const within = (value: number | undefined, low: number, high: number) =>
  typeof value === "number" && Number.isFinite(value) && value >= low && value <= high;

export function readJourneyProgress(raw: string | null): JourneyProgress | null {
  if (!raw || raw.length > 20_000) return null;
  try {
    const data = JSON.parse(raw) as JourneyProgress | null;
    const journey = journeys.find(({ id }) => id === data?.id);
    if (!data || !journey || !Number.isInteger(data.step) || !journey.steps[data.step]) return null;
    if (!Array.isArray(data.stops)) return null;
    const stops = new Map<number, ConnectedStop>();
    for (const entry of data.stops.slice(0, journey.steps.length)) {
      if (!Array.isArray(entry)) continue;
      const [index, stop] = entry;
      if (!Number.isInteger(index) || typeof stop?.arrival?.map !== "boolean") continue;
      const visit = readVisit(stop.visit);
      if (!visit || visit.id !== journey.steps[index]?.id) continue;
      const { map, pose, floatState, city } = stop.arrival;
      const validPose =
        pose &&
        within(pose.lon, -360, 360) &&
        within(pose.lat, -90, 90) &&
        within(pose.zoom, ZOOM_MIN, ZOOM_MAX);
      stops.set(index, {
        visit,
        arrival: {
          map,
          ...(typeof city === "string" && city.length <= 80 ? { city } : {}),
          ...(validPose ? { pose: { lon: pose.lon, lat: pose.lat, zoom: pose.zoom } } : {}),
          ...(visit.position.float && validFloatState(floatState) ? { floatState } : {}),
        },
      });
    }
    return stops.has(data.step) ? { id: journey.id, step: data.step, stops: [...stops] } : null;
  } catch {
    return null;
  }
}

function validFloatState(state: ConnectedStop["arrival"]["floatState"]) {
  return (
    state &&
    within(state.depth, 0, 12_000) &&
    ["locate", "rise", "notice"].includes(state.stage) &&
    ["temperature", "salinity"].includes(state.field) &&
    typeof state.inspecting === "boolean"
  );
}

export function packJourneyProgress(id: string, step: number, stops: Map<number, ConnectedStop>) {
  return JSON.stringify({
    id,
    step,
    stops: Array.from(
      stops,
      ([
        index,
        {
          visit,
          arrival: { map, pose, float, floatState, city },
        },
      ]) => [
        index,
        {
          visit,
          arrival: {
            map,
            pose,
            city,
            floatState: float
              ? {
                  depth: float.depth,
                  stage: float.reading.stage,
                  field: float.reading.field,
                  inspecting: float.reading.inspecting,
                }
              : floatState,
          },
        },
      ],
    ),
  });
}
