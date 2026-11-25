import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { refreshAnnotations } from "../../globe/annotationInput";
import { useStoryNavigation } from "../journeys/StoryNavigation";
import { honolulu, honoluluReading, honoluluTrigger } from "./honolulu";
import "./honolulu.css";

function prepareReading() {
  void import("./TongaStage").catch(() => {});
}

export function HonoluluMarker({ map }: { map: boolean }) {
  const navigation = useStoryNavigation();
  const [stage, setStage] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => setStage(document.getElementById("globe-view")), []);
  const show = !!stage && !!navigation && !navigation.previewOpen && !navigation.unavailable("tonga");
  useLayoutEffect(() => {
    if (show) refreshAnnotations();
  }, [show]);
  if (!show) return null;
  return createPortal(
    <div className="honolulu-markers">
      <button
        type="button"
        id={honoluluTrigger}
        className="honolulu-marker"
        data-observation-anchor=""
        data-compact-anchor=""
        data-lon={honolulu.lon}
        data-lat={honolulu.lat}
        aria-label="Inspect Honolulu pressure from Tonga’s shockwave"
        onPointerEnter={prepareReading}
        onFocus={prepareReading}
        onClick={(event) => {
          event.currentTarget.focus({ preventScroll: true });
          const moment = honoluluReading(map);
          navigation.resume({ id: moment.id, seen: Date.now(), position: { moment } }, honoluluTrigger);
        }}
      >
        <span className="tonga-station-point" aria-hidden="true" />
        <span>
          Honolulu <small>Tonga’s shockwave</small>
        </span>
      </button>
    </div>,
    stage,
  );
}
