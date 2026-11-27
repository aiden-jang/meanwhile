import { useEffect, useLayoutEffect, useRef } from "react";
import type { CameraState } from "../../globe/controlsTypes";
import type { ObservationView } from "../observations/types";
import type { StoryMoment } from "../observations/storyMoment";
import { StoryOnward } from "../continuity/StoryOnward";
import { StoryProjection } from "../observations/StoryProjection";
import { honolulu } from "./honolulu";
import { timeIso } from "./tongaTimeline";
import { first, last } from "./passageTrace";
import type { PassageCamera } from "./passageSurface";
import { attachPassage, type PassageActions } from "./passagePlayback";

export function TongaPassage({
  camera,
  origin,
  map,
  onMap,
  onView,
  remember,
  onBack,
  initial,
  onInspect,
  onExplore,
}: {
  initial: StoryMoment | undefined;
  onInspect: (at: number) => void;
  onExplore: (minute: number, opener: HTMLElement) => void;
  camera: PassageCamera;
  origin: CameraState & { map: boolean };
  map: boolean;
  onMap: (flat: boolean) => void;
  onView: (view: ObservationView) => void;
  remember: (part: Partial<StoryMoment>) => void;
  onBack: () => void;
}) {
  const root = useRef<HTMLElement>(null);
  const actions = useRef<PassageActions>();
  const start = useRef(initial);
  const props = useRef({ map, onBack, onMap, onInspect, onExplore, remember });
  props.current = { map, onBack, onMap, onInspect, onExplore, remember };
  const pose = useRef(origin);
  useLayoutEffect(() => {
    onView({
      kind: "observation",
      image: null,
      target: pose.current,
      holdGeography: true,
      cameraKey: "passage",
      frame: { at: Date.parse(timeIso(honolulu.peak)) },
    });
  }, [onView]);

  useEffect(
    () => attachPassage(root.current!, camera, pose.current, start.current, props, actions),
    [camera],
  );
  return (
    <section ref={root} className="tonga-passage" aria-label="Tonga to Honolulu">
      <div className="passage-tools">
        <button className="passage-back" type="button" onClick={() => actions.current?.back()}>
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <path d="m12 4-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          Back
        </button>
        <StoryProjection map={map} onMap={onMap} label="Tonga projection" />
      </div>
      <div className="passage-scan-caption">
        <p>Hunga Tonga–Hunga Haʻapai</p>
        <div>
          GOES-17 infrared <span>·</span> <time /> <span>·</span> 15 Jan 2022
        </div>
      </div>
      <div className="passage-wave-caption">
        <p>Across the Pacific</p>
        <div>
          Estimated pressure wave <span>·</span> <time />
        </div>
      </div>
      <span className="passage-origin">
        <i />
        Tonga
      </span>
      <button className="passage-sensor" type="button" onClick={() => actions.current?.skip()}>
        <i />
        <span>Honolulu</span>
      </button>
      <div className="passage-reading">
        <header>
          <h2>Honolulu</h2>
          <div className="passage-measurement">
            <strong className="passage-value"></strong>
            <span>hPa</span>
          </div>
        </header>
        <div className="passage-ident">
          <button
            type="button"
            onClick={() => actions.current?.inspect()}
            aria-label="Open Honolulu station record"
          >
            PHNL station pressure ↗
          </button>
          <time className="passage-clock" />
        </div>
        <div className="passage-track">
          <input
            type="range"
            min={first}
            max={last}
            step={1}
            defaultValue={honolulu.peak}
            aria-label="Scrub Honolulu’s measured pressure"
            onInput={(e) => actions.current?.sample(e.currentTarget.valueAsNumber)}
          />
        </div>
        <div className="passage-axis">
          <time>08:15</time>
          <span>Drag the trace</span>
          <time>09:54 UTC</time>
        </div>
        <StoryOnward
          id="explore-honolulu-from-passage"
          label="Explore Honolulu"
          onClick={(event) => actions.current?.explore(event.currentTarget)}
        />
      </div>
      <svg className="passage-graph" width="100%" height="100%" aria-hidden="true">
        <path className="passage-line" />
        <path className="passage-measured" />
        <path className="passage-cursor" />
        <circle r="4.5" className="passage-sample-dot" />
      </svg>
      <div className="passage-footnote">
        <span className="passage-key" />
        <span>Modeled wave</span>
        <span className="passage-sep">·</span>
        <span>ASOS pressure</span>
      </div>
      <button type="button" className="passage-skip" onClick={() => actions.current?.skip()}>
        Skip to reading
      </button>
      <button type="button" className="passage-replay" onClick={() => actions.current?.replay()}>
        Revisit eruption
      </button>
      <span className="passage-error" role="status">
        Satellite scans unavailable. Honolulu’s pressure record is available.
      </span>
    </section>
  );
}
