import { nearestFrame } from "./nearestFrame";
import { refreshAnnotations } from "../../globe/annotationInput";
import { useStoryNavigation } from "../journeys/StoryNavigation";
import type { EarthStoryId } from "./catalogue";
import type { EarthStoryData } from "./types";
import type { useStoryClock } from "./useStoryClock";

export function StorySideActions({
  id,
  data,
  map,
  onMap,
  onRadar,
  clock,
  skyMode,
  setSkyMode,
}: {
  id: EarthStoryId;
  data: EarthStoryData;
  map: boolean;
  onMap: (map: boolean) => void;
  onRadar: () => void;
  clock: ReturnType<typeof useStoryClock>;
  skyMode: boolean;
  setSkyMode: (open: boolean) => void;
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
        <button
          type="button"
          aria-pressed={skyMode && !map}
          onClick={() => {
            clock.pause();
            if (!skyMode && id === "comet") {
              const visible = data.chapters.find((chapter) => chapter.label === "Above my horizon");
              if (visible) clock.seek(nearestFrame(data, visible.at));
            }
            onMap(false);
            setSkyMode(map || !skyMode);
          }}
        >
          {skyMode && !map ? "Back to Earth" : "See from my city"}
        </button>
      </div>
    );
  return null;
}
