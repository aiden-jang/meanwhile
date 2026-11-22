import { useMemo, useState } from "react";
import { sunElevation } from "../../geo/sun";
import { StoryProjection } from "../observations/StoryProjection";
import type { ReplayProps } from "../observations/RecordedReplay";
import type { ObservationFrame } from "../observations/types";
import type { StoryMoment } from "../observations/storyMoment";
import { useSkyReturn } from "../observations/useSkyReturn";
import { useSkyLook } from "../tonight/useSkyLook";
import type { SkyLook } from "../../geo/tonight";
import { nearestFrame } from "./nearestFrame";
import type { EarthStoryData } from "./types";
import type { useStoryClock } from "./useStoryClock";

export function useArchiveSky(
  data: EarthStoryData,
  frame: ObservationFrame,
  initial: StoryMoment | undefined,
  panel: Pick<ReplayProps, "map" | "onMap" | "readCamera" | "restoreCamera">,
  clock: ReturnType<typeof useStoryClock>,
  orbital: boolean,
  focusTime?: number,
) {
  const { at } = frame;
  const [skyMode, setSkyMode] = useState(initial?.chapter === "sky");
  const earth = useSkyReturn(panel);
  const [look, setLook] = useState<SkyLook | undefined>(initial?.aim);
  const trackedSky = useMemo(
    () => (skyMode && !panel.map ? data.sky?.(at) : undefined),
    [skyMode, panel.map, data, at],
  );
  const localSky = useMemo(
    () => (trackedSky && look ? { ...trackedSky, look } : trackedSky),
    [trackedSky, look],
  );
  const lookKey = useSkyLook(localSky ?? null, (view) => setLook(view.look), !!localSky);
  const body = localSky?.bodies.find((point) => point.name === localSky.targetName);
  const status =
    localSky && body && orbital
      ? `${body.name} · ${body.altitude > 0 ? "above horizon" : "below horizon"} · ${sunElevation(localSky.city.lon, localSky.city.lat, at) > -0.833 ? "daylight" : "Sun below horizon"}`
      : localSky && `${localSky.targetName} from ${localSky.city.name}`;
  const leave = (map?: boolean) => {
    clock.pause();
    earth.leave((time) => clock.seek(nearestFrame(data, time)), map);
    setLook(undefined);
    setSkyMode(false);
  };
  const sceneFrame = useMemo(
    () => (orbital && localSky ? { at, ...(frame.orbit?.eclipse ? { orbit: frame.orbit } : {}) } : frame),
    [at, frame, localSky, orbital],
  );
  return {
    sceneFrame,
    localSky,
    skyMode,
    status,
    lookControl: localSky && (
      <button
        type="button"
        onKeyDown={lookKey}
        onClick={() => setLook(undefined)}
        aria-description="Drag the sky or use the arrow keys to look around."
      >
        Follow {localSky.targetName ?? "the sky"}
      </button>
    ),
    toggle() {
      if (localSky) {
        leave();
        return;
      }
      clock.pause();
      earth.capture(at);
      if (focusTime !== undefined) clock.seek(nearestFrame(data, focusTime));
      panel.onMap(false);
      setSkyMode(true);
    },
    action: earth.action,
    projection:
      (orbital && (
        <StoryProjection
          map={panel.map}
          globeActive={!localSky && !panel.map}
          onMap={(map) => (localSky ? leave(map) : panel.onMap(map))}
        >
          <button
            type="button"
            ref={earth.action}
            aria-pressed={!!localSky}
            onClick={() => {
              if (localSky) {
                leave();
                return;
              }
              clock.pause();
              earth.capture(at);
              panel.onMap(false);
              setSkyMode(true);
            }}
          >
            {localSky ? "Back to Earth" : "See from my city"}
          </button>
          {localSky && look && (
            <button type="button" onClick={() => setLook(undefined)}>
              Follow {localSky.targetName ?? "the sky"}
            </button>
          )}
        </StoryProjection>
      )) ||
      undefined,
  };
}
