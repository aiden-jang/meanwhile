import { PlaybackButton } from "../PlaybackButton";
import { radarScanDate, radarScanStatus } from "./radarScanStatus";
import { layerTime } from "../layerTime";
import {
  type KeyboardEventHandler,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { RadarTransport } from "./RadarTransport";
import { TimelineTrack } from "../observations/TimelineTrack";
import type { RadarScan } from "../../sources/radar";
import {
  radarRegions,
  globalRadarRegions,
  globalRadarName,
  currentRadarRegion,
  radarCamera,
  regionCamera,
  strongestRegion,
  type RadarRegion,
  type RadarView,
} from "./radarCamera";
import { useRadarLightning } from "./useRadarLightning";
import { useRadarScans } from "./useRadarScans";
import { radarFeedHealth } from "./radarFeedHealth";

const shortTime = (at: number) => new Date(at).toISOString().slice(11, 16);

export function RadarStage({
  onView,
  initialRegion,
  initialAt,
  initialPose,
  onSelect,
  global,
  layer = false,
  dock,
  suspended = false,
  rewind = false,
}: {
  onView: (view: RadarView) => void;
  initialRegion?: string | undefined;
  initialAt?: number | undefined;
  initialPose?: RadarView["target"] | undefined;
  onSelect?: (at: number | null) => void;
  global: boolean;
  layer?: boolean;
  dock?: KeyboardEventHandler<HTMLElement> | undefined;
  suspended?: boolean;
  rewind?: boolean;
}): JSX.Element {
  const id = useId();
  const held = useRef<RadarScan | null>(null);
  const { scans, images, status, checkedAt, lastSuccess, covers, retry } = useRadarScans(
    held,
    global,
    !layer || Boolean(dock),
    initialAt,
  );
  const [chosen, setChosen] = useState<RadarScan | null>(null);
  const [showLightning, setShowLightning] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [regionId, setRegionId] = useState(initialRegion ?? (global ? "world" : "auto"));
  const [focus, setFocus] = useState<RadarRegion | null | undefined>();
  const latest = scans.at(-1);
  const latestImage = latest && images.get(latest.id);
  const feed = useMemo(
    () =>
      radarFeedHealth({
        status,
        image: latestImage === undefined ? "pending" : latestImage === null ? "failed" : "ok",
        checkedAt,
        latestAt: latest?.at,
        lastSuccess,
      }),
    [status, latestImage, checkedAt, latest?.at, lastSuccess],
  );
  const [restored, setRestored] = useState(initialAt === undefined);
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (restored || status !== "ready") return;
    const saved = scans.find(({ at }) => at === initialAt);
    if (saved) {
      held.current = saved;
      setChosen(saved);
    } else setExpired(true);
    setRestored(true);
  }, [restored, status, scans, initialAt]);
  const candidate = chosen && scans.findIndex(({ at }) => at === chosen.at);
  const index = candidate !== null && candidate >= 0 ? candidate : Math.max(0, scans.length - 1);
  const selected = scans[index];
  const image = selected && images.get(selected.id);
  const previousScan = useRef<RadarScan>();
  useLayoutEffect(() => {
    if (image) previousScan.current = selected;
  }, [image, selected]);
  const shown = image ? selected : previousScan.current;
  const shownImage = shown && images.get(shown.id);
  const showingEarlier = !!shownImage && shown?.at !== selected?.at;
  const canRewind = layer && scans.filter(({ id }) => images.get(id)).length >= 2 ? covers : undefined;
  const autoFocus = useMemo(
    () =>
      focus === undefined && !layer && !global && latestImage
        ? (strongestRegion(latestImage) ?? null)
        : focus,
    [focus, latestImage, global, layer],
  );
  const region =
    regionId === "auto" ? (autoFocus ?? undefined) : radarRegions.find(({ id }) => id === regionId);
  const restoredPose = initialRegion === regionId ? initialPose : undefined;
  const target = useMemo(
    () => restoredPose ?? (global ? radarCamera(regionId) : regionCamera(region)),
    [region, regionId, global, restoredPose],
  );

  const lightning = useRadarLightning(showLightning && shownImage ? shown?.at : undefined);
  useLayoutEffect(
    () =>
      onView({
        kind: "radar",
        region: regionId,
        target,
        image: shownImage ?? null,
        at: shownImage ? shown?.at : undefined,
        selectedAt: restored ? selected?.at : initialAt,
        scan: restored ? selected : undefined,
        canRewind,
        lightning: lightning?.frame ?? undefined,
        feed,
      }),
    [
      shownImage,
      shown?.at,
      lightning,
      onView,
      target,
      selected,
      regionId,
      feed,
      restored,
      initialAt,
      canRewind,
    ],
  );

  const seek = useCallback(
    (scan: RadarScan | null) => {
      held.current = scan;
      setChosen(scan);
      setExpired(false);
      onSelect?.(scan?.at ?? null);
    },
    [onSelect],
  );

  const wasRewinding = useRef(rewind);
  useLayoutEffect(() => {
    if (wasRewinding.current && !rewind) seek(null);
    if (!wasRewinding.current && rewind && image && selected) {
      seek(selected);
      setPlaying(false);
    }
    if ((wasRewinding.current && !rewind) || (rewind && suspended)) setPlaying(false);
    wasRewinding.current = rewind;
  }, [rewind, seek, suspended, image, selected]);

  useEffect(() => {
    if (focus === undefined && autoFocus !== undefined) setFocus(autoFocus);
  }, [focus, autoFocus]);

  useEffect(() => {
    if (suspended || !playing || !selected || image === undefined || document.hidden) return;
    const next = scans[index + 1];
    const timer = window.setTimeout(
      () => {
        if (next) seek(next);
        else if (!rewind) seek(null);
        if (!next) setPlaying(false);
      },
      index === scans.length - 1 ? 820 : 510,
    );
    return () => window.clearTimeout(timer);
  }, [image, index, playing, rewind, scans, selected, seek, suspended]);

  useEffect(() => {
    function visibility() {
      if (document.hidden) setPlaying(false);
    }
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);

  const place = global ? globalRadarName(regionId) : (region?.name ?? "National view");
  const provider = global ? "RainViewer" : "NOAA";
  const { canRetry, problem, statusMessage } = radarScanStatus({
    latest,
    scans,
    images,
    checkedAt,
    status,
    image,
    provider,
    autoFocus: regionId === "auto" && !!region,
  });
  const atLatest = index === scans.length - 1 && chosen === null;
  const timeLabel = selected ? layerTime(selected.at) : "Waiting for scans";

  const timeline = (
    <TimelineTrack
      max={Math.max(0, scans.length - 1)}
      current={index}
      valueLabel={selected && (!layer || rewind) ? `${shortTime(selected.at)} UTC` : undefined}
    >
      <input
        id={id}
        className="scrub-slider radar-scrub"
        type="range"
        min={0}
        max={Math.max(0, scans.length - 1)}
        value={index}
        disabled={scans.length < 2}
        aria-label="Radar scan time"
        aria-valuetext={timeLabel}
        onChange={(event) => {
          setPlaying(false);
          seek(scans[event.currentTarget.valueAsNumber] ?? null);
        }}
      />
    </TimelineTrack>
  );
  function togglePlay() {
    if (!playing && index === scans.length - 1) seek(scans[0] ?? null);
    setPlaying(!playing);
  }

  return (
    <div className="radar-stage-controls">
      {expired && (
        <p role="status" aria-label="Saved radar scan status">
          The saved scan has expired. Showing the latest available scan.
        </p>
      )}
      <div className="radar-transport">
        {problem && (
          <p className="radar-warning" role="status" aria-label="Radar status">
            {statusMessage}
          </p>
        )}
        {showingEarlier && (
          <p className="radar-reading-date">
            Still showing <time dateTime={new Date(shown!.at).toISOString()}>{layerTime(shown!.at)}</time>.
          </p>
        )}
        <RadarTransport layer={layer} dock={dock}>
          <div className="radar-clock">
            <div className="radar-scan-reading">
              {selected && (
                <time dateTime={new Date(selected.at).toISOString()}>
                  <strong>{shortTime(selected.at)} UTC</strong>
                  <span className="radar-reading-date">{radarScanDate(selected.at)}</span>
                </time>
              )}
              {scans[0] && latest && (
                <span className="radar-window">
                  <span className="sr-only">Available scans </span>
                  {shortTime(scans[0].at)}–{shortTime(latest.at)} UTC
                </span>
              )}
            </div>
            {!rewind && (
              <button
                type="button"
                className="radar-latest"
                title="Jump to the latest scan"
                aria-pressed={atLatest}
                disabled={!selected}
                onClick={() => {
                  setPlaying(false);
                  seek(null);
                }}
              >
                Latest
              </button>
            )}
          </div>
          {timeline}
          <div className="observatory-actions radar-actions radar-playback">
            <button
              type="button"
              aria-label="Previous radar scan"
              disabled={index === 0 || scans.length < 2}
              onClick={() => {
                setPlaying(false);
                seek(scans[index - 1] ?? null);
              }}
            >
              Previous
            </button>
            <PlaybackButton
              playing={playing}
              ended={index === scans.length - 1}
              disabled={scans.length < 2}
              onClick={togglePlay}
            />
            <button
              type="button"
              aria-label="Next radar scan"
              disabled={index >= scans.length - 1 || scans.length < 2}
              onClick={() => {
                setPlaying(false);
                seek(scans[index + 1] ?? null);
              }}
            >
              Next
            </button>
          </div>
        </RadarTransport>
        <div className="observatory-actions radar-actions">
          {!layer && !global && (
            <button
              type="button"
              aria-pressed={showLightning}
              disabled={!selected}
              onClick={() => setShowLightning((on) => !on)}
            >
              Lightning
            </button>
          )}
          {showLightning && selected && (
            <p role="status" aria-label="Lightning status">
              {lightning === undefined
                ? "Checking GOES-East…"
                : lightning.failed
                  ? "Couldn’t load lightning data."
                  : !lightning.frame
                    ? "No lightning scan matches this radar time."
                    : `GOES-East · ${lightning.frame.measurements?.[0]?.value ?? "Unknown"} detections · ${shortTime(lightning.frame.at)} UTC`}
            </p>
          )}
        </div>
      </div>
      <div className="radar-reading">
        {!layer && (
          <div className="radar-place">
            <h3>{place}</h3>
            <label>
              <span className="sr-only">Radar region</span>
              <select value={regionId} onChange={(event) => setRegionId(event.currentTarget.value)}>
                {global && initialPose && <option value={currentRadarRegion}>Current view</option>}
                {!global && <option value="auto">Auto focus</option>}
                {!global && <option value="national">United States</option>}
                {(global ? globalRadarRegions : radarRegions).map(({ id, name }) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {!layer && !problem && (
          <p role="status" aria-label="Radar status">
            {statusMessage}
          </p>
        )}
        {canRetry && (
          <button type="button" className="radar-retry" onClick={retry}>
            Retry {provider}
          </button>
        )}
      </div>
    </div>
  );
}
