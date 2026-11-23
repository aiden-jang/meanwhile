import { useCallback, useRef } from "react";
import { reportAnalytics } from "../../analytics/browser";
import type { DepthRecord } from "../data/depthRecords";
import type { visibleHazards } from "./layerVisibility";
import type { createFeed } from "./feed";
import type { useGlobeCamera } from "./useGlobeCamera";
import { findSubject } from "./MarkCard";
import { stormCamera } from "./storm/stormCamera";
import { liftForPanel } from "./panelLift";
import { tick } from "./touch";
import { revealReadingInWorld } from "../globe/annotationInput";

export function useWorldSelection({
  onGlobe,
  observing,
  enterExplore,
  camera,
  flyTo,
  nearbyOrigin,
  followStorm,
  setMarkId,
  setSelected,
  feed,
}: Pick<ReturnType<typeof useGlobeCamera>, "camera" | "flyTo"> & {
  onGlobe: ReturnType<typeof visibleHazards>;
  observing: boolean;
  enterExplore: () => void;
  nearbyOrigin: DepthRecord | undefined;
  followStorm: ((id: string) => void) | undefined;
  setMarkId: (id: string | null) => void;
  setSelected: (key: string | null) => void;
  feed: ReturnType<typeof createFeed>;
}) {
  const onGlobeRef = useRef(onGlobe);
  onGlobeRef.current = onGlobe;
  const observingRef = useRef(observing);
  observingRef.current = observing;
  const follow = useRef(followStorm);
  follow.current = followStorm;
  const selectMark = useCallback(
    (id: string | null) => {
      const found = findSubject(id, onGlobeRef.current);
      const openStorm = found?.kind === "cyclone" ? follow.current : undefined;
      if (openStorm && id) openStorm(id);
      else setMarkId(id);
      // A quake hit clears the mark without clearing the quake.
      if (id === null) return;
      if (!openStorm && observingRef.current) enterExplore();
      setSelected(null);
      if (found) {
        reportAnalytics({ name: "event_opened" });
        const target =
          found.kind === "cyclone" && openStorm
            ? stormCamera(found.subject)
            : { ...found.subject, zoom: Math.max(camera.current.zoom, 2.2) };
        flyTo.current(target.lon, target.lat, target.zoom, liftForPanel());
      }
    },
    [enterExplore, camera, flyTo, setMarkId, setSelected],
  );
  const selectQuake = useCallback(
    (key: string | null) => {
      if (key !== null) tick();
      setMarkId(null);
      setSelected(key);
      /* `Math.max`, so pinning never zooms somebody out of the view they chose. */
      if (key === null) return;
      const quake = feed.store.get(key);
      if (!quake) return;
      if (observingRef.current) enterExplore();
      reportAnalytics({ name: "event_opened" });
      if (nearbyOrigin) revealReadingInWorld(quake.primary, nearbyOrigin);
      else
        flyTo.current(
          quake.primary.lon,
          quake.primary.lat,
          Math.max(camera.current.zoom, 1.9),
          liftForPanel(),
        );
    },
    [enterExplore, camera, flyTo, nearbyOrigin, feed, setMarkId, setSelected],
  );
  return { selectMark, selectQuake };
}
