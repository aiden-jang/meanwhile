import { RadarReading, StormRadarCoverage } from "./RadarReading";
import { RadarPlayer, shortRadarTime } from "./RadarPlayer";
import { radarScanStatus } from "./radarScanStatus";
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
import type { StormRadarVisit } from "../storm/useStormRadarVisit";
import { TimelineTrack } from "../observations/TimelineTrack";
import type { RadarScan } from "../../sources/radar";
import {
  radarRegions,
  globalRadarName,
  radarCamera,
  regionCamera,
  strongestRegion,
  type RadarRegion,
  type RadarView,
} from "./radarCamera";
import { useRadarLightning } from "./useRadarLightning";
import { useRadarScans } from "./useRadarScans";
import { radarFeedHealth } from "./radarFeedHealth";

export type RadarScope = { id: string; lon: number; lat: number; visit: StormRadarVisit };

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
  storm,
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
  storm?: RadarScope | undefined;
}): JSX.Element {
  const id = useId();
  const held = useRef<RadarScan | null>(null);
  const { at: stormAt, open: stormOpen, select: selectStorm } = storm?.visit ?? {};
  const { scans, images, status, checkedAt, lastSuccess, covers, retry } = useRadarScans(
    held,
    global,
    !layer || Boolean(dock) || (!!stormOpen && !suspended),
    stormAt ?? initialAt,
    storm,
  );
  const [baseScan, setChosen] = useState<RadarScan | null>(null);
  const chosen = storm ? (scans.find(({ at }) => at === stormAt) ?? null) : baseScan;
  const coverage = storm && covers?.(storm);
  const stormId = storm?.id;
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
  const worldImage = !storm || coverage === true ? shownImage : null;
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
        image: worldImage ?? null,
        at: worldImage ? shown?.at : undefined,
        selectedAt: restored ? selected?.at : initialAt,
        scan: restored ? selected : undefined,
        canRewind,
        lightning: lightning?.frame ?? undefined,
        feed,
      }),
    [
      worldImage,
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
      if (selectStorm) return selectStorm(scan?.at ?? null);
      held.current = scan;
      setChosen(scan);
      setExpired(false);
      onSelect?.(scan?.at ?? null);
    },
    [onSelect, selectStorm],
  );

  useLayoutEffect(() => {
    setPlaying(false);
  }, [stormId]);
  useLayoutEffect(() => {
    if (stormId && (!stormOpen || suspended)) setPlaying(false);
  }, [stormId, stormOpen, suspended]);
  const wasRewinding = useRef(rewind);
  useLayoutEffect(() => {
    if (!stormId && wasRewinding.current && !rewind) seek(null);
    if (!stormId && !wasRewinding.current && rewind && image && selected) {
      seek(selected);
      setPlaying(false);
    }
    if ((wasRewinding.current && !rewind) || (rewind && suspended)) setPlaying(false);
    wasRewinding.current = rewind;
  }, [rewind, seek, suspended, image, selected, stormId]);

  useEffect(() => {
    if (focus === undefined && autoFocus !== undefined) setFocus(autoFocus);
  }, [focus, autoFocus]);

  useEffect(() => {
    if (
      suspended ||
      (stormId && (coverage !== true || !stormOpen)) ||
      !playing ||
      !selected ||
      image === undefined ||
      document.hidden
    )
      return;
    const next = scans[index + 1];
    const timer = window.setTimeout(
      () => {
        if (next) seek(next);
        else if (!rewind || stormId) seek(null);
        if (!next) setPlaying(false);
      },
      index === scans.length - 1 ? 820 : 510,
    );
    return () => window.clearTimeout(timer);
  }, [image, index, playing, rewind, scans, selected, seek, suspended, stormId, stormOpen, coverage]);

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
      valueLabel={selected && (!layer || rewind) ? `${shortRadarTime(selected.at)} UTC` : undefined}
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
      {((expired && !storm) || (stormOpen && stormAt != null && status === "ready" && !chosen)) && (
        <p role="status" aria-label="Saved radar scan status">
          The saved scan has expired. Showing the latest available scan.
        </p>
      )}
      <div className="radar-transport">
        {problem && coverage !== false && (
          <p className="radar-warning" role="status" aria-label="Radar status">
            {statusMessage}
          </p>
        )}
        {storm && <StormRadarCoverage {...{ coverage, problem }} />}
        {showingEarlier && (!storm || coverage) && (
          <p className="radar-reading-date">
            Still showing <time dateTime={new Date(shown!.at).toISOString()}>{layerTime(shown!.at)}</time>.
          </p>
        )}
        {storm && !stormOpen && coverage === true && selected && (
          <div className="radar-coverage storm-radar-launch">
            <time dateTime={new Date(selected.at).toISOString()}>{timeLabel}</time>
            <button
              className="layer-story-link"
              type="button"
              id="replay-nearby-radar"
              onClick={() => {
                storm.visit.start();
                if (scans.length > 1 && !matchMedia("(prefers-reduced-motion: reduce)").matches) togglePlay();
              }}
            >
              {scans.length > 1 ? "Replay nearby radar" : "View nearby radar"}
            </button>
          </div>
        )}
        {(!storm || (stormOpen && coverage === true)) && (
          <RadarPlayer
            {...{ layer, dock, scans, index, atLatest, playing, togglePlay }}
            displayed={!!image}
            showLatest={!rewind || !!storm}
            seek={(scan) => {
              setPlaying(false);
              seek(scan);
            }}
          >
            {timeline}
          </RadarPlayer>
        )}
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
                    : `GOES-East · ${lightning.frame.measurements?.[0]?.value ?? "Unknown"} detections · ${shortRadarTime(lightning.frame.at)} UTC`}
            </p>
          )}
        </div>
      </div>
      <RadarReading
        initialPose={!!initialPose}
        {...{
          layer,
          place,
          regionId,
          setRegionId,
          global,
          problem,
          statusMessage,
          canRetry,
          provider,
          retry,
        }}
      />
    </div>
  );
}
