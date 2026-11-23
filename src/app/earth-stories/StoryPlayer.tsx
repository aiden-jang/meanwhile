import { startLabels, storyClass } from "./storyClass";
import { FaultComparison } from "./FaultComparison";
import { refreshAnnotations } from "../../globe/annotationInput";
import { useArchiveSky } from "./CelestialView";
import { StoryFinding } from "../journeys/StoryFinding";
import { useStoryCompletion } from "../journeys/useStoryCompletion";
import { StoryLoading } from "../StoryLoading";
import { useJourneyGestures } from "../journeyCamera";
import { storyMapTarget } from "./mapFraming";
import { StoryTimeline } from "./StoryTimeline";
import { nearestFrame, openingFrame } from "./nearestFrame";
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
import { StoryImageRecovery, StoryRecovery } from "./StoryRecovery";
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
  const [site, setSite] = useState(initial?.chapter?.startsWith("site:") ? initial.chapter.slice(5) : "");
  const arrive = useCallback(() => setReady(true), []);
  const [start] = useState(() => openingFrame(data, id, initial?.at));
  const selected = data.sites?.find((p) => p.id === site);
  const waiting = useRef(true);
  const surveyed = id === "bloom" || id === "nino";
  const clock = useStoryClock(
    data.frames.length,
    start,
    waiting,
    initial?.at !== undefined,
    !startLabels[id] && !surveyed,
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
  const glacier = useGlacierComparison(data.glacier, initial?.chapter, clock.pause);
  const dust = useDustSlice(id === "dust", data, frame.at, initial?.chapter, panel.map, clock);
  const moorings = useMooringInspection(frame.moorings, data.frames, initial?.chapter, clock.pause);
  const openCurtain = id !== "nino" || ready || initial?.at !== undefined;
  const section = useTerrainSection(
    data.terrain,
    initial?.chapter,
    () => {
      clock.pause();
      panel.onMap(true);
    },
    !clock.playing && index === duration,
  );
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
  const target = useMemo(
    () =>
      dust.target
        ? dust.target
        : selected
          ? { ...data.target, lon: selected.lon, lat: selected.lat }
          : panel.map
            ? mapTarget
            : data.target,
    [selected, data.target, mapTarget, panel.map, dust.target],
  );
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
      : caption;
  const time = frame.timeLabel ?? format.format(frame.at) + " UTC";
  const settled = !busy && status === "ready" && bloom.status === "ready";
  const finished = settled && !clock.playing && clock.position >= duration;
  useStoryCompletion(finished);
  const shoreline = useShorelineComparison({
    basins: data.basins,
    finished,
    frame,
    map: panel.map,
    chapter: initial?.chapter,
    pause: clock.pause,
    playing: clock.playing,
  });
  waiting.current ||= shoreline.holding;
  const displayedImage = shoreline.image ?? element;
  const framing = shoreline.framing ?? dust.framing;
  const comparingShoreline = id === "aral" && finished;
  const holdGeography =
    ready && (glacier.comparing || shoreline.holding || (!!shoreline.basin && !clock.playing));
  const inspecting = dust.forcedPause || glacier.comparing || selected || shoreline.holding;
  const canFly = !(inspecting || panel.map || localSky || orbitStory || surveyed);
  const motionProgress = canFly && clock.cinematic && clock.playing ? clock.position / duration : undefined;
  const terrainProgress = data.terrain
    ? section.inspecting || panel.map
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
      moonImage: lunarImage.element,
      onPick: glacier.pick ?? section.pick,
      pickOnGlobe: !!glacier.pick,
      pickMarks: shoreline.pickMarks ?? (openCurtain ? moorings.picks : undefined),
      holdGeography,
      ...(data.lens && !localSky ? { lens: data.lens } : {}),
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
    holdGeography,
    data.lens,
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
  useJourneyGestures(clock.pause, clock.resume, clock.position < duration, !localSky);
  const chooseSite = (value: string) => {
    setSite(value);
    const point = data.sites?.find((p) => p.id === value);
    if (point) {
      clock.seek(nearestFrame(data, point.at));
      refreshAnnotations({ lon: point.lon, lat: point.lat, zoom: data.target.zoom });
    }
  };
  const readings = (
    <StoryReadings {...{ id, data, frame, index, site, selected, chooseSite }} seek={clock.seek} />
  );
  const chooseReading = (value: string) => {
    clock.pause();
    setChoice(value);
  };
  const choices = <StoryChoices id={id} city={city} choice={choice} select={chooseReading} />;
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
      finding={id !== "aral"}
      status={comparingShoreline ? null : (sky.status ?? displayCaption)}
      at={
        comparingShoreline || orbitStory || fieldStory ? undefined : (
          <time dateTime={frame.dateTime ?? new Date(frame.at).toISOString()}>{time}</time>
        )
      }
      sharedMoment={
        initial?.at !== undefined && id === "aral" ? { ...initial, at: data.frames[start]!.at } : undefined
      }
      primaryAction={dust.action}
      sources={<StorySources id={id} />}
      inset={
        <>
          <StoryOverlay localSky={localSky} data={data} frame={frame} site={site} chooseSite={chooseSite} />
          {shoreline.labels}
          {openCurtain && moorings.labels}
        </>
      }
    >
      {id !== "north" && choices}
      {section.controls}
      {section.chart}
      {moorings.controls}
      {dust.control}
      {!orbitStory && <StorySideActions {...panel} {...{ id, data, onRadar, clock, sky }} />}
      {(busy || status === "loading") && <StoryLoading>Loading the selected observations…</StoryLoading>}
      {shoreline.reading}
      {fault && (
        <FaultComparison {...panel} data={data} selected={selected} at={frame.at} seek={clock.seek} />
      )}
      {fault && readings}
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
      {id === "north" && choices}
      {glacier.control}
      {comparingShoreline ? (
        <StoryFinding id={id} completed>
          {shoreline.controls}
        </StoryFinding>
      ) : (
        shoreline.controls
      )}
      {!fault && id !== "north" && readings}
      {failed && (
        <StoryRecovery
          reefRecent={id === "reef" && choice === "Recent observations"}
          retry={retry}
          archive={() => setChoice("2023 archive")}
          holding
        />
      )}
      <StoryImageRecovery assets={[image, curtainImage, lunarImage]} />
    </ReplayPanel>
  );
}
