import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CameraState } from "../../globe/controlsTypes";
import { iceberg } from "../../sources/observations/iceberg";
import { useStoryClock } from "../earth-stories/useStoryClock";
import { FixedJourneyEnding } from "../journeys/FixedJourney";
import { useStoryNavigation } from "../journeys/StoryNavigation";
import { useStoryCompletion } from "../journeys/useStoryCompletion";
import { PlaybackButton } from "../PlaybackButton";
import { ReplayPanel, type ReplayProps } from "../observations/RecordedReplay";
import { useStorySession } from "../observations/StorySession";
import { useObservationData, useObservationImage } from "../observations/useObservationData";
import { useReportStorySource } from "../observations/StorySourceStatus";
import { captureReplayFrame, restoreReplayFrame } from "../observations/replayReturn";
import { StoryLoading } from "../StoryLoading";
import {
  BREAKUP,
  BREAKUP_END,
  END,
  FIRST_FRAGMENT,
  TRACK_OPENING,
  dayAt,
  driftCamera,
  icebergTrackView,
  tracks,
} from "./icebergTimeline";
import { IcebergWorld, icebergSources } from "./IcebergWorld";
import { refreshAnnotations } from "../../globe/annotationInput";
import { IcebergReading } from "./IcebergReading";

export function IcebergDrift({ onView, ...panel }: ReplayProps) {
  const { initial, remember } = useStorySession();
  const guided = useStoryNavigation()?.route?.id === "ice-in-motion";
  const [choice, setChoice] = useState(() => tracks.find(({ id }) => id === initial?.choice)?.id ?? "A");
  const [opening, setOpening] = useState(() => initial?.at === undefined || initial?.chapter === "approach");
  const [photo, setPhoto] = useState(() => initial?.chapter === "photo");
  const [linked, setLinked] = useState(() => initial?.chapter === "fragment");
  const [arrivedShot, setArrivedShot] = useState<CameraState | undefined | null>(null);
  const [breakup, setBreakup] = useState(false);
  const [replayOpen, setReplayOpen] = useState(false);
  const saved = useRef<ReturnType<typeof captureReplayFrame>>();
  const photoButton = useRef<HTMLButtonElement>(null);
  const readingPanel = useRef<HTMLDivElement>(null);
  const held = useRef(true);
  const startAt = initial?.at === undefined && !guided ? TRACK_OPENING : dayAt(initial?.at);
  const [shot, setShot] = useState<CameraState | undefined>(() =>
    initial?.at === undefined && !guided
      ? icebergTrackView
      : opening && !panel.map
        ? driftCamera(startAt)
        : undefined,
  );
  const arrived = arrivedShot === shot;
  const framing = useMemo(() => ({ map: panel.map, onReady: () => setArrivedShot(shot) }), [panel.map, shot]);
  const arrive = useCallback(() => {}, []);
  const { data, state, retry } = useObservationData(iceberg, choice);
  useReportStorySource("iceberg", state, retry);
  held.current = state !== "ready" || !arrived;
  const clock = useStoryClock(END + 1, startAt, held, initial?.at !== undefined, false);
  const { pause } = clock;
  const index = Math.floor(clock.position);
  const frame = data?.frames[index];
  const revealing = breakup && clock.playing;
  const geography = useMemo(
    () =>
      frame && (revealing || !arrived)
        ? {
            ...frame,
            reconstruction: arrived,
            ...(revealing ? { markWindow: { from: index - 2, to: index + 1, showAhead: true } } : {}),
          }
        : frame,
    [arrived, frame, index, revealing],
  );
  const traceProgress = revealing
    ? Math.min(1.1, Math.max(0.18, (clock.position - FIRST_FRAGMENT) / 16))
    : undefined;
  const marks = frame?.marks ?? [];
  const track = tracks.find(({ id }) => id === choice) ?? tracks[0]!;
  const fix = track.fixes.find(([day]) => day === index);
  const photograph = frame?.photograph;
  const image = useObservationImage(photo ? photograph?.url : undefined);
  const showingPhoto = photo && !!photograph;
  const selectMark = useCallback(
    (selected: number) => {
      const mark = frame?.marks?.[selected];
      if (!mark?.id) return;
      pause();
      setBreakup(false);
      setOpening(false);
      setLinked(true);
      setChoice(mark.id);
      requestAnimationFrame(() => readingPanel.current?.scrollIntoView({ block: "nearest" }));
    },
    [frame?.marks, pause],
  );
  const finished = index === END && !clock.playing;
  useStoryCompletion(finished && !opening);

  const target = shot ?? data?.target;
  const following = clock.playing && clock.cinematic && !panel.map;
  const pose = following ? clock.position : null;
  useLayoutEffect(() => {
    if (!data || !frame || !geography || !target || state !== "ready") return;
    onView({
      kind: "observation",
      frame: geography,
      target,
      image: null,
      ...(data.lens ? { lens: data.lens } : {}),
      holdGeography: arrived && !following,
      arrive,
      comparisonFrame: framing,
      capture: !showingPhoto,
      ...(pose === null ? {} : { follow: driftCamera(pose, choice) }),
      ...(traceProgress === undefined ? {} : { traceProgress }),
      ...(showingPhoto ? {} : { pickMarks: { points: frame.marks ?? [], select: selectMark } }),
    });
    remember?.({
      choice,
      chapter: showingPhoto ? "photo" : opening ? "approach" : linked ? "fragment" : "",
      map: panel.map,
    });
  }, [
    data,
    frame,
    state,
    panel.map,
    arrived,
    following,
    arrive,
    framing,
    target,
    showingPhoto,
    pose,
    selectMark,
    onView,
    remember,
    choice,
    geography,
    traceProgress,
    linked,
    opening,
  ]);

  function seek(day: number) {
    setBreakup(false);
    setOpening(false);
    setPhoto(false);
    clock.seek(day);
  }

  function playBreakup() {
    if (!data) return;
    setChoice("A");
    setOpening(false);
    setLinked(false);
    setPhoto(false);
    setBreakup(true);
    if (!guided) setReplayOpen(true);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setShot(panel.map || reduced ? { ...data.target } : driftCamera(FIRST_FRAGMENT));
    refreshAnnotations({ camera: "resume" });
    clock.playFrom(reduced && guided ? BREAKUP_END : reduced ? BREAKUP : FIRST_FRAGMENT, BREAKUP_END);
  }

  function photoAction() {
    if (showingPhoto) {
      setPhoto(false);
      restoreReplayFrame(saved.current, panel, () => photoButton.current);
    } else if (photograph) {
      saved.current = { ...captureReplayFrame(panel), focus: photoButton.current };
      clock.pause();
      setPhoto(true);
    } else {
      seek(BREAKUP);
    }
  }

  return (
    <ReplayPanel
      {...panel}
      title="Iceberg Drift"
      location="Scotia Sea · South Georgia"
      subtitle="Follow A-68A toward South Georgia, then see where the fragments were recorded."
      className="iceberg-journey"
      finding={!guided}
      status={revealing ? "Fragments appear on their first recorded dates" : null}
      inset={
        showingPhoto ? (
          <figure className="iceberg-photo" aria-busy={image.status === "loading"}>
            <div className="iceberg-photo-image">
              {image.status === "ready" && image.element && (
                <img src={image.element.src} alt={photograph.alt} />
              )}
            </div>
            <figcaption>{photograph.alt}</figcaption>
          </figure>
        ) : (
          arrived && (
            <IcebergWorld
              marks={marks}
              fragment={choice}
              select={selectMark}
              linked={linked}
              day={index}
              fixes={track.fixes}
              onGrab={() => {
                pause();
                setBreakup(false);
              }}
              onSeek={seek}
            />
          )
        )
      }
      sources={
        <>
          {icebergSources}
          <p>{data?.note}</p>
        </>
      }
    >
      {!frame && state === "loading" && <StoryLoading>Loading recorded iceberg tracks…</StoryLoading>}
      {state === "failed" && (
        <div role="status" className="observatory-actions">
          <p>The recorded tracks couldn’t open.</p>
          <button type="button" onClick={retry}>
            Retry tracks
          </button>
        </div>
      )}
      {frame && data && (
        <>
          <IcebergReading
            frame={frame}
            index={index}
            fix={fix}
            photo={showingPhoto}
            linked={linked}
            readingPanel={readingPanel}
            photoButton={photoButton}
            image={image}
            onSeek={seek}
            onPhoto={photoAction}
            replayOpen={replayOpen}
            onReplay={() => setReplayOpen(!replayOpen)}
          >
            <PlaybackButton
              playing={clock.playing}
              ended={finished}
              startLabel={opening ? "Follow the drift" : undefined}
              onClick={() => {
                setOpening(false);
                setLinked(false);
                if (clock.playing) clock.pause();
                else if (finished) {
                  setBreakup(false);
                  clock.replay();
                } else clock.resume();
              }}
            />
          </IcebergReading>
          {!guided && !showingPhoto && (
            <div className="observatory-actions">
              <button type="button" onClick={playBreakup} disabled={revealing}>
                Watch the breakup
              </button>
            </div>
          )}
          <div className="iceberg-filters" hidden={showingPhoto}>
            <label className="observation-picker">
              <span>Iceberg</span>
              <select
                value={choice}
                onChange={(event) => {
                  const track = tracks.find(({ id }) => id === event.currentTarget.value);
                  if (!track) return;
                  setChoice(track.id);
                  setLinked(true);
                  seek(marks.some(({ id }) => id === track.id) ? index : track.fixes.at(-1)![0]);
                }}
              >
                {iceberg.options?.map(({ id, label }) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <div className="archive-scene-controls" aria-label="Drift chapters">
              {data.chapters?.map((chapter) => (
                <button
                  key={chapter.index}
                  className="archive-scene-button"
                  type="button"
                  onClick={() => {
                    if (chapter.index >= BREAKUP) {
                      if (arrived) panel.restoreCamera?.(data.target);
                      else setShot(data.target);
                    }
                    seek(chapter.index);
                  }}
                >
                  {chapter.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      {guided && (
        <FixedJourneyEnding
          journey="ice-in-motion"
          title="Three ways ice moves"
          finishFocus=".iceberg-reading h3"
          ready={state === "ready"}
          playing={revealing}
          canRead={!opening && index >= FIRST_FRAGMENT && !revealing}
          replay={playBreakup}
        >
          <p>
            Sea ice retreats seasonally. Land ice flows toward the coast. Once afloat, pieces of an iceberg
            can take separate paths.
          </p>
        </FixedJourneyEnding>
      )}
    </ReplayPanel>
  );
}
