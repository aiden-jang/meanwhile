import { startLabels, storyClass } from "./storyClass";
import { FaultComparison, type FaultMode } from "./FaultComparison";
import { firstFaultSite } from "./groundStories";
import { useArchiveSky } from "./CelestialView";
import { StoryFinding } from "../journeys/StoryFinding";
import { useStoryCompletion } from "../journeys/useStoryCompletion";
import { StoryLoading } from "../StoryLoading";
import { useJourneyGestures } from "../journeyCamera";
import { storyMapTarget } from "./mapFraming";
import { StoryTimeline } from "./StoryTimeline";
import { openingFrame } from "./nearestFrame";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ReplayPanel, type ReplayProps } from "../observations/RecordedReplay";
import { useObservationImage } from "../observations/useObservationData";
import { useStorySession } from "../observations/StorySession";
import { type SkyCityPreference } from "../tonight/SkyCityPicker";
import { earthStories, type EarthStoryId } from "./catalogue";
import type { EarthStoryData } from "./types";
import { useStoryClock } from "./useStoryClock";
import { storyCamera } from "./motion";
import { StoryOverlay } from "./StoryOverlay";
import { StoryReadings } from "./StoryReadings";
import { StoryImageRecovery, StoryRecovery, storyRecoveryArchive } from "./StoryRecovery";
import { StorySideActions } from "./StorySideActions";
import { StoryChoices } from "./StoryChoices";
import { useMooringInspection } from "./useMooringInspection";
import { useBloomComparison } from "./useBloomComparison";
import { useShorelineComparison } from "./useShorelineComparison";
import { StorySources } from "./StorySources";
import { useGlacierComparison } from "./useGlacierComparison";
import { useTerrainSection } from "./useTerrainSection";
import { addDustTrack, useDustSlice } from "./useDustSlice";
const format = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" });
type Props = ReplayProps & { id: EarthStoryId; city: SkyCityPreference; onRadar: () => void };
export function StoryPlayer({
  data,
  choice,
  displayedChoice,
  setChoice,
  busy,
  failed,
  retry,
  city,
  id,
  onView,
  onRadar,
  ...panel
}: Props & {
  data: EarthStoryData;
  choice: string;
  displayedChoice: string;
  setChoice: (value: string) => void;
  busy: boolean;
  failed: boolean;
  retry: () => void;
}): JSX.Element {
  const meta = earthStories[id];
  const { initial, remember } = useStorySession();
  const fault = id === "fault";
  const fieldStory = id === "dust" || fault || id === "ice" || id === "glacier" || !!data.coastalTarget;
  const orbitStory = id === "apophis" || id === "eclipse";
  const [ready, setReady] = useState(false);
  const [start] = useState(() => openingFrame(data, id, initial?.at));
  const [site, setSite] = useState(
    initial?.chapter?.startsWith("site:")
      ? initial.chapter.slice(5)
      : fault && start > 0
        ? firstFaultSite
        : "",
  );
  const [faultMode, setFaultMode] = useState<FaultMode>(
    start === 0 ? "replay" : start === 2 ? "radar" : "survey",
  );
  const arrive = useCallback(() => setReady(true), []);
  const selected = data.sites?.find((p) => p.id === site);
  const waiting = useRef(true);
  const surveyed = id === "bloom" || id === "nino";
  const clock = useStoryClock(
    data.frames.length,
    start,
    waiting,
    initial?.at !== undefined || (id === "dust" && !!initial?.chapter),
    !fault && !startLabels[id] && !surveyed,
    id === "seafloor" ? 8500 : data.playbackDuration,
    data.pace,
    id === "seafloor" ? "elapsed" : "sampled",
  );
  const duration = Math.max(1, data.frames.length - 1);
  const index = Math.min(data.frames.length - 1, Math.floor(clock.position));
  const current = data.frames[index]!;
  const requested = useMemo(() => data.geometry?.(current) ?? current, [data, current]);
  const image = useObservationImage(requested.raster?.url, id);
  const bloom = useBloomComparison({
    enabled: id === "bloom",
    frame: requested,
    primary: image.element,
    choice: displayedChoice,
    chapter: initial?.chapter,
    pause: clock.pause,
  });
  const lunarImage = useObservationImage(data.lunarImage);
  const curtainImage = useObservationImage(requested.section?.image, `${id}:section`);
  const holding = useRef({
    frame: requested,
    element: image.element,
    caption: current.caption,
    surface: bloom.surface,
  });
  if (
    (!requested.raster || image.status === "ready") &&
    (!requested.section || curtainImage.status === "ready") &&
    (bloom.status === "ready" || !holding.current.surface)
  )
    holding.current = {
      frame: requested,
      element: image.element,
      caption: current.caption,
      surface: bloom.surface,
    };
  const { frame, element, caption, surface } = holding.current;
  const glacier = useGlacierComparison(data.glacier, initial, clock.pause, panel);
  const dust = useDustSlice(id === "dust", data, frame.at, initial?.chapter, panel.map, clock);
  const moorings = useMooringInspection(frame, data.frames, initial?.chapter, clock.pause);
  const openCurtain = id !== "nino" || ready || initial?.at !== undefined;
  const section = useTerrainSection(data.terrain, initial?.chapter, panel.onMap, clock, duration);
  const viewFrame = useMemo(() => {
    if (!data.terrain) return frame;
    return {
      ...frame,
      ...(section.inspecting ? { paths: section.paths } : {}),
      ...(section.marks.length ? { marks: section.marks } : {}),
    };
  }, [data.terrain, frame, section.inspecting, section.paths, section.marks]);
  const status =
    image.status !== "ready"
      ? image.status
      : curtainImage.status !== "ready"
        ? curtainImage.status
        : lunarImage.status;
  waiting.current = busy || !ready || status !== "ready" || bloom.status !== "ready";
  const mapTarget = useMemo(() => storyMapTarget(data), [data]);
  const target = dust.target ?? glacier.target ?? (panel.map ? mapTarget : data.target);
  const lens = dust.lens ?? data.lens;
  const sky = useArchiveSky(
    data,
    viewFrame,
    initial,
    panel,
    clock,
    orbitStory,
    id === "comet" ? data.chapters.find((chapter) => chapter.label === "Above my horizon")?.at : undefined,
  );
  const { localSky, skyMode } = sky;
  const fieldFrame = useMemo(
    () =>
      glacier.mark ? { ...sky.sceneFrame, marks: glacier.mark } : addDustTrack(sky.sceneFrame, dust.track),
    [sky.sceneFrame, glacier.mark, dust.track],
  );
  const displayCaption =
    failed && id === "reef" && choice === "Recent observations"
      ? "Recent reef data unavailable · showing previous observations"
      : section.cue || moorings.cue || dust.cue || caption;
  const time = frame.timeLabel ?? format.format(frame.at) + " UTC";
  const settled = !busy && status === "ready" && bloom.status === "ready";
  const finished = settled && !clock.playing && clock.position >= duration;
  useStoryCompletion(finished && (!fault || faultMode === "replay"));
  const shoreline = useShorelineComparison({
    basins: data.basins,
    archiveImage: element,
    table: data.waterSamples,
    frames: data.frames,
    seek: clock.seek,
    finished,
    frame,
    map: panel.map,
    chapter: initial?.chapter,
    pause: clock.pause,
    playing: clock.playing,
  });
  waiting.current ||= shoreline.holding;
  const displayedImage = shoreline.image ?? element;
  const framing = glacier.framing ?? shoreline.framing ?? dust.framing;
  const comparingShoreline = id === "aral" && finished;
  const holdGeography =
    ready &&
    (glacier.holding || shoreline.holding || ((!!shoreline.basin || shoreline.pinned) && !clock.playing));
  const inspecting = dust.forcedPause || glacier.comparing || selected || shoreline.holding;
  const canFly = !(inspecting || panel.map || localSky || orbitStory || surveyed);
  const motionProgress = canFly && clock.cinematic && clock.playing ? clock.position / duration : undefined;
  const terrainProgress = data.terrain
    ? section.inspecting
      ? 1
      : Math.min(1, (clock.position / duration) * 2.3)
    : 0;
  const momentAt = id === "ice" ? current.at : frame.at;
  useLayoutEffect(() => {
    if (momentAt !== frame.at) remember?.({ at: momentAt, map: panel.map });
    if (status === "loading" && (id !== "bloom" || !element)) return;
    if (frame.raster && (!element || element.src !== new URL(frame.raster.url, location.href).href)) return;
    onView({
      kind: "observation",
      ...(id === "dust" ? { cameraKey: dust.chapter ? "lidar" : "surface" } : {}),
      frame: fieldFrame,
      target,
      image: displayedImage,
      ...(bloom.comparing && surface ? { surface, surveyDivider: bloom.divider } : {}),
      ...(glacier.surface ? { surface: glacier.surface, surveyDivider: glacier.divider } : {}),
      ...(shoreline.surface ? { surface: shoreline.surface } : {}),
      moonImage: lunarImage.element,
      onPick: glacier.pick ?? shoreline.pickWater ?? section.pick,
      pickOnGlobe: !!glacier.pick || !!shoreline.pickWater,
      pickMarks: shoreline.pickMarks ?? (openCurtain ? moorings.picks : undefined),
      holdGeography,
      localSurveyProjection: id === "aral" || glacier.comparing,
      ...(lens && !localSky ? { lens } : {}),
      ...(data.terrain ? { terrain: { grid: data.terrain, progress: terrainProgress } } : {}),
      arrive,
      ...(framing ? { comparisonFrame: framing } : {}),
      sky: localSky,
      ...(frame.section && curtainImage.element && openCurtain
        ? {
            curtain: {
              ...frame.section,
              down: true,
              image: curtainImage.element,
              moorings: moorings.visible,
              mooringFocus: moorings.selected,
            },
          }
        : dust.curtain
          ? { curtain: dust.curtain }
          : {}),
      follow:
        motionProgress === undefined
          ? undefined
          : storyCamera(id, target, motionProgress, data.coastalTarget),
    });
    remember?.({
      at: momentAt,
      aim: localSky?.look,
      choice: displayedChoice,
      city: city.name,
      chapter:
        shoreline.chapter ||
        section.chapter ||
        moorings.chapter ||
        bloom.chapter ||
        dust.chapter ||
        glacier.chapter ||
        (skyMode ? "sky" : site ? `site:${site}` : ""),
      map: panel.map,
    });
  }, [
    frame,
    momentAt,
    fieldFrame,
    bloom.comparing,
    bloom.divider,
    bloom.chapter,
    surface,
    section.pick,
    section.chapter,
    terrainProgress,
    target,
    element,
    displayedImage,
    framing,
    shoreline.chapter,
    shoreline.pickMarks,
    shoreline.pickWater,
    shoreline.surface,
    holdGeography,
    lens,
    data.terrain,
    data.coastalTarget,
    arrive,
    motionProgress,
    localSky,
    panel.map,
    onView,
    id,
    displayedChoice,
    city.name,
    skyMode,
    glacier.surface,
    glacier.comparing,
    glacier.divider,
    glacier.pick,
    glacier.chapter,
    dust.chapter,
    dust.curtain,
    site,
    remember,
    curtainImage.element,
    lunarImage.element,
    moorings.visible,
    moorings.selected,
    moorings.chapter,
    moorings.picks,
    openCurtain,
    status,
  ]);
  useJourneyGestures(clock.pause, clock.resume, clock.position < duration, !localSky && !glacier.comparing);
  const chooseSite = (value: string) => {
    setSite(value);
    if (index !== 1 || clock.playing) clock.seek(1);
  };
  const readings = <StoryReadings {...{ id, data, frame, index }} seek={clock.seek} />;
  const chooseReading = (value: string) => {
    clock.pause();
    setChoice(value);
  };
  const choices = <StoryChoices id={id} city={city} choice={choice} select={chooseReading} />;
  const actions = !orbitStory && <StorySideActions {...{ id, data, onRadar, clock, sky }} />;
  return (
    <ReplayPanel
      {...panel}
      horizon={orbitStory && !!localSky}
      projection={sky.projection}
      focusOnEntry={false}
      title={meta.title}
      location={localSky ? `${city.name} · ${new Date(frame.at).getUTCFullYear()} sky` : meta.location}
      subtitle={meta.summary}
      className={storyClass(id, fieldStory, orbitStory)}
      finding={id !== "aral" && (!fault || faultMode === "replay")}
      status={id === "aral" || glacier.comparing ? null : (sky.status ?? displayCaption)}
      at={
        comparingShoreline || orbitStory || fieldStory ? undefined : (
          <time dateTime={frame.dateTime ?? new Date(frame.at).toISOString()}>{time}</time>
        )
      }
      sharedMoment={
        initial?.at !== undefined && id === "aral" ? { ...initial, at: data.frames[start]!.at } : undefined
      }
      primaryAction={glacier.control || dust.action || section.controls || actions}
      sources={<StorySources id={id} />}
      inset={
        <>
          <StoryOverlay {...{ localSky, data, frame, site, chooseSite }} inspectSites={index < duration} />
          {section.world || dust.world || glacier.world || shoreline.labels}
          {openCurtain && moorings.labels}
        </>
      }
    >
      {id !== "north" && !glacier.comparing && choices}
      {section.chart}
      {moorings.controls}
      {dust.control}
      {(busy || (status === "loading" && (!fault || faultMode !== "radar"))) && (
        <StoryLoading>Loading the selected observations…</StoryLoading>
      )}
      {shoreline.reading}
      {fault && data.sites && (
        <FaultComparison
          {...panel}
          sites={data.sites}
          {...{ selected, index, clock, chooseSite }}
          mode={faultMode}
          onMode={setFaultMode}
          scan={image.status}
        />
      )}
      {!glacier.comparing && (!fault || faultMode === "replay") && (
        <StoryTimeline
          startLabel={clock.cinematic && clock.position === 0 ? startLabels[id] : undefined}
          data={data}
          frame={{ ...frame, caption }}
          settled={settled}
          index={index}
          clock={clock}
          busy={busy}
          time={time}
          restored={initial?.at !== undefined}
          comparison={bloom.controls}
          compareDates={!fault}
          yearReading={id === "north" ? readings : undefined}
          label={
            data.timelineLabel ??
            (id === "fire" ? "Detection time" : id === "comet" ? "July 2020 · UTC" : "Observation time")
          }
        />
      )}
      {id === "north" && choices}
      {comparingShoreline ? (
        <StoryFinding id={id} completed>
          {shoreline.controls}
        </StoryFinding>
      ) : (
        shoreline.controls
      )}
      {id !== "north" && !glacier.comparing && readings}
      {failed && (
        <StoryRecovery retry={retry} archive={storyRecoveryArchive(id, choice, setChoice)} holding />
      )}
      <StoryImageRecovery assets={[image, curtainImage, lunarImage]} />
    </ReplayPanel>
  );
}
