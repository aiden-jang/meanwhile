import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { refreshAnnotations } from "../../globe/annotationInput";
import { useStoryNavigation } from "../journeys/StoryNavigation";
import { firstFloatProfile, floatExploreTrigger } from "../float/firstProfile";
import { honolulu, honoluluReading, honoluluTrigger } from "../tonga/honolulu";
import type { VisitPosition } from "../visitor/library";
import "./world-story-markers.css";

const markers = [
  {
    id: "tonga",
    trigger: honoluluTrigger,
    place: honolulu,
    title: "Honolulu",
    subtitle: "Tonga’s shockwave",
    action: "Inspect archived station pressure",
    prepare: () => import("../tonga/TongaStage"),
    position: (map: boolean): VisitPosition => ({ moment: honoluluReading(map) }),
  },
  {
    id: "float",
    trigger: floatExploreTrigger,
    place: firstFloatProfile,
    title: "Float Dive",
    subtitle: "Labrador Sea · Argo",
    action: "Inspect the recorded ocean profile",
    prepare: () => import("../float/FloatDivePanel"),
    position: (map: boolean): VisitPosition => ({
      float: { profile: `recorded/${firstFloatProfile.id}`, index: 278, ...(map ? { map: true } : {}) },
    }),
  },
] as const;

export function WorldStoryMarkers({ map }: { map: boolean }) {
  const navigation = useStoryNavigation();
  const [stage, setStage] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => setStage(document.getElementById("globe-view")), []);
  const show = !!stage && !!navigation && !navigation.previewOpen && !navigation.unavailable("tonga");
  useLayoutEffect(() => {
    if (show) refreshAnnotations();
  }, [show]);
  if (!show) return null;
  return createPortal(
    <div className="world-story-markers">
      {markers.map(({ id, trigger, place, title, subtitle, action, prepare, position }) => {
        const warm = () => void prepare().catch(() => {});
        return (
          <button
            key={id}
            type="button"
            id={trigger}
            className="world-story-marker"
            data-observation-anchor=""
            data-world-story-marker=""
            data-compact-anchor=""
            data-lon={place.lon}
            data-lat={place.lat}
            aria-description={action}
            onPointerEnter={warm}
            onFocus={warm}
            onClick={(event) => {
              event.currentTarget.focus({ preventScroll: true });
              navigation.resume({ id, seen: Date.now(), position: position(map) }, trigger);
            }}
          >
            <span className="world-story-dot" aria-hidden="true" />
            <span>
              {title} <small>{subtitle}</small>
            </span>
          </button>
        );
      })}
    </div>,
    stage,
  );
}
