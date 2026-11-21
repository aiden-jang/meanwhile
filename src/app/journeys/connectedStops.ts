import type { CameraState } from "../../globe/controls";
import type { StoryPlace } from "../discovery/places";
import type { FloatCheckpoint } from "../float/floatPlayback";
import { rainCoast } from "../observations/RainbeltControls";
import type { Visit } from "../visitor/library";

export interface JourneyArrival {
  map: boolean;
  pose?: CameraState | undefined;
  float?: FloatCheckpoint | undefined;
  departure?: StoryPlace | undefined;
}

export type ConnectedStop = { visit: Visit; arrival: JourneyArrival };

export function connectedArrival(
  stops: Map<number, ConnectedStop>,
  from: number,
  to: number,
  next: string,
  visit: Visit | null,
  here: JourneyArrival & { pose: CameraState },
): ConnectedStop {
  if (visit) stops.set(from, { visit, arrival: here });
  const stopped = stops.get(to);
  const { pose, map, float } = here;
  const pacific = pose.lon < -103 && pose.lon > -179 && pose.lat > 12 && pose.lat < 63;
  return {
    visit: stopped?.visit ?? { id: next, seen: Date.now(), position: { moment: { id: next, map } } },
    arrival: {
      map: stopped?.arrival.map ?? map,
      pose: stopped?.arrival.pose ?? (next === "rain" ? (pacific ? pose : rainCoast) : undefined),
      float: stopped?.arrival.float,
      departure: float
        ? { lon: float.profile.lon, lat: float.profile.lat, label: "North Atlantic · Argo" }
        : undefined,
    },
  };
}
