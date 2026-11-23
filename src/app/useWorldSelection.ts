import { useCallback, useRef } from "react";
import { reportAnalytics } from "../../analytics/browser";
import type { DepthRecord } from "../data/depthRecords";
import type { visibleHazards } from "./layerVisibility";
import type { createFeed } from "./feed";
import type { useGlobeCamera } from "./useGlobeCamera";
import { findSubject } from "./MarkCard";
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
  setMarkId,
  setSelected,
  feed,
}: Pick<ReturnType<typeof useGlobeCamera>, "camera" | "flyTo"> & {
  onGlobe: ReturnType<typeof visibleHazards>;
  observing: boolean;
  enterExplore: () => void;
  nearbyOrigin: DepthRecord | undefined;
  setMarkId: (id: string | null) => void;
  setSelected: (key: string | null) => void;
  feed: ReturnType<typeof createFeed>;
}) {
  const onGlobeRef = useRef(onGlobe);
  onGlobeRef.current = onGlobe;
  const observingRef = useRef(observing);
  observingRef.current = observing;
  const selectMark = useCallback(
    (id: string | null) => {
      setMarkId(id);
      // A quake hit clears the mark without clearing the quake.
      if (id === null) return;
      if (observingRef.current) enterExplore();
      setSelected(null);
      const where = findSubject(id, onGlobeRef.current)?.subject;
      if (where) {
        reportAnalytics({ name: "event_opened" });
        flyTo.current(where.lon, where.lat, Math.max(camera.current.zoom, 2.2), liftForPanel());
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
