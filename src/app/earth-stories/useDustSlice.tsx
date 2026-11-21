import { useCallback, useMemo, useState } from "react";
import { refreshAnnotations } from "../../globe/annotationInput";
import transect from "../../sources/earth-stories/dust-transect.json";
import type { GeoPoint, ObservationView } from "../observations/types";
import { useObservationImage } from "../observations/useObservationData";
import { DustSliceControls } from "./DustSliceControls";
import { nearestFrame } from "./nearestFrame";
import { asset, date, point, type EarthStoryData } from "./types";
import type { useStoryClock } from "./useStoryClock";

const observation = date("2020-06-23");
const points = transect.points.map(point);
const track = { points, color: 0xf1d4a2, trace: true };
const globeTarget = { lon: -84, lat: 20, zoom: 1.32 };
const mapTarget = { lon: -67, lat: 20, zoom: 1.5 };

export function useDustSlice(
  enabled: boolean,
  data: EarthStoryData,
  frameAt: number,
  chapter: string | undefined,
  map: boolean,
  clock: ReturnType<typeof useStoryClock>,
) {
  const [open, setOpen] = useState(enabled && chapter === "slice");
  const [arrived, setArrived] = useState(false);
  const ready = useCallback(() => setArrived(true), []);
  const image = useObservationImage(enabled ? asset(transect.image) : undefined, "lidar");
  const available = enabled && (open || frameAt === observation);
  const visible = open && image.status === "ready" && arrived;
  const framing = useMemo(
    () => (open && !arrived ? { map, onReady: ready } : undefined),
    [open, arrived, map, ready],
  );
  const curtain = useMemo<ObservationView["curtain"]>(
    () =>
      visible && image.element
        ? { points, heightKm: transect.height, exaggeration: transect.exaggeration, image: image.element }
        : undefined,
    [visible, image.element],
  );
  return {
    target: open ? (map ? mapTarget : globeTarget) : undefined,
    track: available ? track : undefined,
    curtain,
    framing,
    chapter: open ? "slice" : "",
    forcedPause: open,
    control: enabled && (
      <DustSliceControls
        open={open}
        image={image.element?.src}
        failed={image.status === "failed"}
        retry={image.retry}
        toggle={() => {
          clock.pause();
          setArrived(false);
          if (!open) {
            refreshAnnotations({ camera: "resume" });
            clock.seek(nearestFrame(data, observation));
          }
          setOpen(!open);
        }}
      />
    ),
  };
}

export function addDustTrack(
  view: ObservationView["frame"],
  track: { points: GeoPoint[]; color: number; trace: boolean } | undefined,
) {
  return track ? { ...view, paths: [...(view.paths ?? []), track], flow: true } : view;
}
