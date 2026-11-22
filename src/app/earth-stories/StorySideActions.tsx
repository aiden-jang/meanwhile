import { refreshAnnotations } from "../../globe/annotationInput";
import { useStoryNavigation } from "../journeys/StoryNavigation";
import type { EarthStoryId } from "./catalogue";
import type { EarthStoryData } from "./types";
import type { useStoryClock } from "./useStoryClock";

export function StorySideActions({
  id,
  data,
  onRadar,
  clock,
  sky,
}: {
  id: EarthStoryId;
  data: EarthStoryData;
  onRadar: () => void;
  clock: ReturnType<typeof useStoryClock>;
  sky: ReturnType<typeof import("./CelestialView").useArchiveSky>;
}) {
  const guided = useStoryNavigation()?.route?.id === "water-in-motion";
  if (id === "atmospheric-river")
    return (
      <div className="observatory-actions">
        <button
          type="button"
          onClick={() => {
            clock.pause();
            const cell = data.frames[Math.floor(clock.position)]?.marks?.[0];
            refreshAnnotations(
              cell
                ? { lon: cell.lon, lat: cell.lat, zoom: data.coastalTarget?.zoom ?? 1.88 }
                : data.coastalTarget,
            );
          }}
        >
          Focus the Pacific coast
        </button>
        {!guided && (
          <button type="button" onClick={onRadar}>
            View current Pacific radar
          </button>
        )}
      </div>
    );
  if (data.sky)
    return (
      <div className="observatory-actions">
        <button type="button" ref={sky.action} aria-pressed={!!sky.localSky} onClick={sky.toggle}>
          {sky.localSky ? "Back to Earth" : "See from my city"}
        </button>
        {sky.lookControl}
      </div>
    );
  return null;
}
