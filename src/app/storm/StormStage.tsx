import { useStoryCompletion } from "../journeys/useStoryCompletion";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ReplayPanel, type ReplayProps } from "../observations/RecordedReplay";
import { gulf, stormGeography, stormLens, stormTarget } from "./stormGlobe";
import { ReadingLabel } from "../observations/ReadingLabel";
import { captureReplayFrame, restoreReplayFrame } from "../observations/replayReturn";
import { useObservationImage } from "../observations/useObservationData";
import { FIXES, START, PEAK_MINUTE, TRACK_MINUTES, stormClock, stormFrame } from "./stormTrack";

import { useStorySession } from "../observations/StorySession";
import { useStoryNavigation } from "../journeys/StoryNavigation";
import { savedVisitKey } from "../visitor/library";
import terra from "./terra-2005-08-28.webp?url";
import { StormFinding, StormInvitation, StormSources } from "./StormNarrative";
import { StormLandfallComparison, StormReading, StormWindExtent } from "./StormReadings";
import { StormTrackWorld } from "./StormTrackWorld";
import { refreshAnnotations } from "../../globe/annotationInput";
import { duration, fixedComparison, initialPlayback, seekTo, type Playback } from "./stormPlayback";
import { StormTransport } from "./StormTransport";
import { stormJourney } from "../journeys/stormJourney";

const comparisonTarget = { lon: -88.25, lat: 26.75, zoom: 1.92 };
const MOTION = "(prefers-reduced-motion: reduce)";
const peakFrame = stormFrame(fixedComparison(PEAK_MINUTE).elapsed, true);

export function StormStage({ onView, ...panel }: ReplayProps): JSX.Element {
  const { initial, remember } = useStorySession();
  const navigation = useStoryNavigation();
  const guided = navigation?.route?.id === stormJourney;
  const fromWeather = navigation?.katrinaFromWeather === true;
  const [view, setView] = useState<Playback>(() =>
    initial && initial.chapter !== "intro" && (!guided || initial.at !== undefined)
      ? initialPlayback(initial.at ?? START, initial.chapter === "compare")
      : fromWeather
        ? seekTo(0)
        : { elapsed: 0, survey: matchMedia(MOTION).matches, playing: false, phase: "intro" },
  );
  const clock = useRef(view);
  const playback = useRef<HTMLButtonElement>(null);
  const reading = useRef<HTMLHeadingElement>(null);
  const replayPoint = useRef<Playback | null>(null);
  const from = useRef<ReturnType<typeof captureReplayFrame>>();
  const comparisonButton = useRef<HTMLButtonElement>(null);
  const comparisonReturn = useRef<ReturnType<typeof captureReplayFrame>>();
  const [paired, setPaired] = useState(false);
  const hold = useRef(false);
  const camera = useRef(panel);
  camera.current = panel;
  const [archiveReady, setArchiveReady] = useState(false);
  const { element: coast } = useObservationImage(gulf.url);
  const [ready, setReady] = useState(false);
  const arrive = useCallback(() => setReady(true), []);

  const update = useCallback((next: Playback) => {
    clock.current = next;
    setView(next);
  }, []);

  useEffect(() => {
    if (!view.playing || !ready) return;
    let previous: number | undefined;
    let lastReadout = 0;
    let request = 0;
    function tick(now: number) {
      const current = clock.current;
      if (!current.playing) return;
      const dt = previous === undefined ? 0 : now - previous;
      previous = now;
      const elapsed = Math.min(duration(current), current.elapsed + dt);
      const next =
        elapsed >= duration(current)
          ? fixedComparison(TRACK_MINUTES)
          : { ...current, elapsed, playing: true };
      clock.current = next;
      if (!next.playing) {
        replayPoint.current = seekTo(TRACK_MINUTES);
        from.current = captureReplayFrame(camera.current);
      }
      if (!next.playing || now - lastReadout >= 75) {
        setView(next);
        lastReadout = now;
      }
      if (next.playing) request = requestAnimationFrame(tick);
    }
    function visibility() {
      cancelAnimationFrame(request);
      previous = undefined;
      if (!document.hidden) request = requestAnimationFrame(tick);
    }
    document.addEventListener("visibilitychange", visibility);
    visibility();
    return () => {
      cancelAnimationFrame(request);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [view.playing, ready]);

  useEffect(() => {
    const motion = matchMedia(MOTION);
    function change(event: MediaQueryListEvent) {
      if (!event.matches || clock.current.survey) return;
      const at = stormFrame(clock.current.elapsed, false).storm.at;
      update({ ...seekTo((at - START) / 60_000), phase: clock.current.phase });
    }
    motion.addEventListener("change", change);
    return () => motion.removeEventListener("change", change);
  }, [update]);

  const comparing = view.phase === "compare";
  const invited = view.phase === "intro";
  const compareAt = useCallback(
    (minute: number) => {
      if (!comparing) {
        replayPoint.current = invited ? seekTo(0) : { ...clock.current, playing: false };
        from.current = captureReplayFrame(camera.current);
      }
      if (!comparing) hold.current = false;
      update(fixedComparison(minute));
      if (!comparing) requestAnimationFrame(() => reading.current?.focus({ preventScroll: true }));
    },
    [comparing, invited, update],
  );

  const inspectFix = useCallback(
    (index: number) => {
      compareAt((FIXES[index]!.time - START) / 60_000);
    },
    [compareAt],
  );
  const archiveOpacity =
    !guided && !panel.map && archiveReady && !initial && (view.phase === "intro" || !view.survey)
      ? Math.max(0, 1 - view.elapsed / 1600)
      : 0;
  const visibleArchive = archiveOpacity > 0;
  useLayoutEffect(() => {
    const frame = stormFrame(view.elapsed, view.survey);
    const arriving = fromWeather && !ready;
    const firstTrack = fromWeather && ready && !comparing && !view.playing && view.elapsed === 0;
    const geography = stormGeography(
      paired ? peakFrame : frame,
      !view.survey,
      comparing,
      firstTrack || (guided && invited),
    );
    onView({
      kind: "observation",
      ...geography,
      ...(arriving ? { frame: { at: geography.frame.at }, follow: undefined } : {}),
      ...(paired ? { frame: { ...geography.frame, at: frame.storm.at } } : {}),
      ...(firstTrack ? { follow: undefined } : {}),
      ...(hold.current ? { holdGeography: true, follow: undefined } : {}),
      ...(guided && !view.playing ? { follow: undefined } : {}),
      capture: !visibleArchive,
      image: coast,
      target: comparing ? comparisonTarget : stormTarget,
      lens: stormLens,
      ...(hold.current ? {} : { arrive }),
      pickMarks:
        invited || visibleArchive || arriving || paired ? undefined : { points: FIXES, select: inspectFix },
    });
    remember?.({ chapter: guided && invited ? "intro" : comparing ? "compare" : "" });
  }, [
    view,
    onView,
    arrive,
    coast,
    comparing,
    remember,
    visibleArchive,
    invited,
    inspectFix,
    guided,
    fromWeather,
    ready,
    paired,
  ]);
  const storm = stormFrame(view.elapsed, view.survey).storm;
  const { fix } = storm;
  const minute = Math.floor((storm.at - START) / 60_000);
  const ended = view.elapsed >= duration(view);
  const kept =
    comparing && navigation?.library.saved.some((entry) => savedVisitKey(entry) === `katrina:${fix.time}`);
  const progress = stormClock(storm.at);
  useStoryCompletion(comparing);
  const atFix = storm.at === fix.time;

  function toggle() {
    hold.current = false;
    const current = clock.current;
    if (current.playing) update({ ...current, playing: false });
    else if (current.phase === "compare" || current.elapsed >= duration(current)) {
      update({ elapsed: 0, playing: true, survey: matchMedia(MOTION).matches, phase: "follow" });
    } else update({ ...current, playing: true });
  }

  function follow() {
    update(
      matchMedia(MOTION).matches
        ? fixedComparison(TRACK_MINUTES)
        : { elapsed: 0, survey: false, playing: true, phase: "follow" },
    );
    requestAnimationFrame(() => playback.current?.focus({ preventScroll: true }));
  }

  function backToReplay() {
    hold.current = !!from.current;
    update(replayPoint.current ?? seekTo(minute));
    restoreReplayFrame(from.current, panel, () => playback.current);
  }

  function startTrackScrub() {
    refreshAnnotations({ camera: "freeze" });
  }

  function openPair(opener: HTMLButtonElement) {
    comparisonReturn.current = { ...captureReplayFrame(panel), focus: opener };
    startTrackScrub();
    setPaired(true);
  }

  function closePair() {
    setPaired(false);
    restoreReplayFrame(comparisonReturn.current, panel, () => comparisonButton.current);
    comparisonReturn.current = undefined;
  }

  const readings = <StormReading refHeading={reading} fix={fix} atFix={atFix} live={comparing} />;
  const transport = (
    <StormTransport
      at={storm.at}
      minute={minute}
      fixIndex={storm.fixIndex}
      comparing={comparing}
      playing={view.playing}
      ended={ended}
      buttonRef={playback}
      onSeek={(value) => {
        if (comparing) inspectFix(value);
        else update(seekTo(value));
      }}
      onInspect={compareAt}
      onToggle={toggle}
    />
  );
  const comparisonActions = (
    <div className="observatory-actions storm-keep-actions">
      {navigation && (
        <button
          type="button"
          disabled={kept}
          className="storm-keep"
          onClick={() => {
            const selected = navigation.current();
            if (selected) navigation.library.save(selected);
          }}
        >
          {kept ? "Fix kept" : "Keep this fix"}
        </button>
      )}
      <button type="button" onClick={backToReplay}>
        Back to replay
      </button>
      {navigation?.library.notice && (
        <p className="observation-note" role="status">
          {navigation.library.notice}
        </p>
      )}
    </div>
  );

  return (
    <ReplayPanel
      {...panel}
      onClose={paired ? closePair : panel.onClose}
      closeLabel={paired ? "Back to track" : panel.closeLabel}
      finding={false}
      sharing={!paired}
      ending={!paired}
      deferSharedView={comparing}
      save={!comparing}
      className={`storm-journey${comparing ? " storm-track-inspector" : ""}${paired ? " storm-track-comparing" : ""}`}
      title="Eye of the Storm"
      location="Gulf of Mexico"
      subtitle={
        comparing
          ? "Hurricane Katrina · 28–29 August 2005"
          : "Hurricane Katrina · NOAA best track · 28–29 Aug 2005"
      }
      status={
        fromWeather
          ? "Recorded · August 2005"
          : visibleArchive
            ? "NASA Terra MODIS · 28 Aug 2005 · 17:00 UTC"
            : invited || comparing
              ? "NOAA best track"
              : view.survey || ended
                ? "Track overview"
                : "Camera follows storm center"
      }
      inset={
        <>
          {!initial && !guided && (
            <img
              className="storm-archive"
              src={terra}
              alt=""
              aria-hidden="true"
              onLoad={() => setArchiveReady(true)}
              style={{ opacity: archiveOpacity, scale: 1 + (1 - archiveOpacity) * 0.07 }}
              hidden={archiveReady && !visibleArchive}
            />
          )}
          {comparing && (
            <StormTrackWorld
              begin={startTrackScrub}
              select={inspectFix}
              selected={storm.fixIndex}
              comparing={paired}
            />
          )}
          {comparing && <StormWindExtent fix={paired ? peakFrame.storm.fix : fix} atFix onWorld />}
          {!paired &&
            (comparing || (view.phase === "inspect" && !view.playing && (!fromWeather || ready))) && (
              <div className="storm-map-labels" aria-hidden="true">
                <span
                  key={storm.fixIndex}
                  data-observation-anchor=""
                  data-storm-fix={storm.fixIndex}
                  data-evidence-source="true"
                  data-compact-anchor=""
                  data-projection-anchor=""
                  data-lon={fix.lon}
                  data-lat={fix.lat}
                />
                <ReadingLabel reading={fix.at} shortDock={comparing}>
                  {fix.wind} kt · {fix.pressure} hPa
                </ReadingLabel>
              </div>
            )}
        </>
      }
      at={
        !visibleArchive && (
          <time dateTime={new Date(storm.at).toISOString()}>
            <small>{progress.split(" · ")[0]}</small> {progress.split(" · ")[1]}
          </time>
        )
      }
      sources={<StormSources />}
    >
      {fromWeather && !ready ? (
        <p className="observation-note" role="status">
          Approaching the Gulf of Mexico…
        </p>
      ) : invited ? (
        <StormInvitation onFollow={follow} onInspect={() => inspectFix(0)} />
      ) : paired ? (
        <StormLandfallComparison />
      ) : (
        <div className="archive-scene-console" data-storm-phase={comparing ? "compare" : view.phase}>
          {comparing ? (
            <StormFinding
              selected={storm.fixIndex}
              onInspect={compareAt}
              readings={readings}
              transport={transport}
              actions={comparisonActions}
              comparisonButton={comparisonButton}
              openComparison={openPair}
            />
          ) : (
            <>
              {readings}
              {transport}
            </>
          )}
          {!comparing && <StormWindExtent fix={fix} atFix={atFix} />}
        </div>
      )}
    </ReplayPanel>
  );
}
