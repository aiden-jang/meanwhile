import { useStoryNavigation } from "../journeys/StoryNavigation";
import type { weatherOrigins } from "./weatherHandoff";
import terra from "./terra-2005-08-28.webp?url";

type KatrinaTrigger = Exclude<keyof typeof weatherOrigins, "quiet-cyclones-radar">;

export function StormStoryLink({ trigger }: { trigger: KatrinaTrigger }) {
  const navigation = useStoryNavigation();
  if (!navigation) return null;
  return (
    <button
      className="storm-story-link"
      type="button"
      id={trigger}
      disabled={!!navigation.unavailable("katrina")}
      onClick={(event) => {
        event.currentTarget.focus({ preventScroll: true });
        navigation.open("katrina", trigger);
      }}
    >
      <img src={terra} alt="" width={54} height={42} loading="lazy" decoding="async" />
      <span>
        Watch Katrina’s landfall <small>Recorded · August 2005</small>
      </span>
    </button>
  );
}

export function QuietCycloneLinks({ at, map }: { at: number | undefined; map: boolean }) {
  const navigation = useStoryNavigation();
  return (
    <div className="quiet-cyclone-links">
      <p role="status">No active cyclones reported in this window.</p>
      <button
        id="quiet-cyclones-radar"
        type="button"
        className="layer-story-link"
        disabled={!navigation || !!navigation.unavailable("radar")}
        onClick={(event) => {
          event.currentTarget.focus({ preventScroll: true });
          navigation?.openRadar(at, map, "quiet-cyclones-radar");
        }}
      >
        Open storm radar <span>Recent scans where available</span>
      </button>
      <StormStoryLink trigger="quiet-cyclones-katrina" />
    </div>
  );
}
