import { ORIGIN } from "./tongaTimeline";
import { eruptionMarker } from "./honolulu";
function warm() {
  void import("./passageSurface").then(({ preparePassage }) => preparePassage()).catch(() => {});
}
export function TongaLocator({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      id={eruptionMarker}
      className="passage-locator"
      data-observation-anchor=""
      data-compact-anchor=""
      data-eruption-locator=""
      data-world-story-marker=""
      data-lon={ORIGIN.lon}
      data-lat={ORIGIN.lat}
      onPointerEnter={warm}
      onFocus={warm}
      onClick={(event) => {
        event.currentTarget.focus({ preventScroll: true });
        onOpen();
      }}
      aria-label="Follow Tonga’s shockwave"
    >
      <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
        <circle cx="9" cy="9" r="2.3" fill="currentColor" />
        <circle cx="9" cy="9" r="6.4" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
      <span>
        Tonga<span className="passage-title-tail">’s shockwave</span>
      </span>
    </button>
  );
}
