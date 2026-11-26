import { useStoryCompletion } from "../journeys/useStoryCompletion";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ReplayPanel, type ReplayProps } from "../observations/RecordedReplay";
import { captureReplayFrame, restoreReplayFrame } from "../observations/replayReturn";
import { refreshAnnotations } from "../../globe/annotationInput";
import { FlashTransport } from "./FlashTransport";
import { FlashWindow } from "./FlashWindow";
import { FlashWorld } from "./FlashWorld";
import { flashGeography, flashLens, flashStart, flashTarget, type FlashPhase } from "./flashGlobe";
import {
  DURATION,
  elapsedFor,
  FINAL_STEP,
  FLIGHT_END,
  flashFrame,
  scan,
  stepAt,
  timeAtStep,
} from "./flashTimeline";
import infrared from "./infrared.webp?url";

import { useStoryNavigation } from "../journeys/StoryNavigation";
import { useStorySession } from "../observations/StorySession";

const MOTION = "(prefers-reduced-motion: reduce)";

interface Playback {
  elapsed: number;
  playing: boolean;
  fixed: boolean;
  phase: FlashPhase;
}

const still = (at: number, phase: Playback["phase"]): Playback => ({
  elapsed: elapsedFor(at),
  playing: false,
  fixed: true,
  phase,
});
const infraredView = () => still(timeAtStep(-1), "infrared");
const overview = () => still(DURATION, "extent");
const opening = () => still(0, "first");
const flight = (): Playback => ({ elapsed: 0, playing: true, fixed: false, phase: "replay" });

export function MegaflashStage({ onView, ...panel }: ReplayProps): JSX.Element {
  const { initial, remember } = useStorySession();
  const navigation = useStoryNavigation();
  const [view, setView] = useState<Playback>(() => {
    if (!initial) return still(0, "inspect");
    if (initial.chapter === "infrared") return infraredView();
    if (initial.chapter === "first") return opening();
    if (initial.chapter === "extent") return overview();
    const offset = Math.max(0, Math.min(DURATION, (initial.at ?? flashStart) - flashStart));
    const at = timeAtStep(stepAt(offset));
    return still(at, initial.chapter === "inspect" || at < DURATION ? "inspect" : "extent");
  });
  const [image, setImage] = useState<HTMLImageElement | null | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const arrive = useCallback(() => setReady(true), []);
  const [reading, setReading] = useState(false);
  const clock = useRef(view);
  const held = useRef(false);
  const lastOptical = useRef(initial?.chapter === "infrared" ? still(0, "inspect") : view);
  const readingReturn = useRef<{ frame: ReturnType<typeof captureReplayFrame>; view: Playback }>();
  const playback = useRef<HTMLButtonElement>(null);

  function update(next: Playback) {
    clock.current = next;
    setView(next);
  }

  useEffect(() => {
    const image = new Image();
    image.src = infrared;
    let closed = false;
    void image.decode().then(
      () => {
        if (!closed) setImage(image);
      },
      () => {
        if (!closed) setImage(null);
      },
    );
    return () => {
      closed = true;
    };
  }, []);

  const waiting = image === undefined;
  useEffect(() => {
    if (!view.playing || waiting || !ready) return;
    let previous: number | undefined;
    let lastReadout = 0;
    let frame = 0;
    function tick(now: number) {
      const current = clock.current;
      if (!current.playing) return;
      const elapsed = current.elapsed + (previous === undefined ? 0 : now - previous);
      previous = now;
      if (elapsed >= (current.fixed ? elapsedFor(DURATION) : FLIGHT_END)) {
        update(overview());
        return;
      }
      const next = { ...current, elapsed };
      clock.current = next;
      if (now - lastReadout >= 100) {
        lastReadout = now;
        setView(next);
      }
      frame = requestAnimationFrame(tick);
    }
    function visibility() {
      cancelAnimationFrame(frame);
      previous = undefined;
      if (!document.hidden) frame = requestAnimationFrame(tick);
    }
    document.addEventListener("visibilitychange", visibility);
    visibility();
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [waiting, view.playing, ready]);

  useEffect(() => {
    const motion = matchMedia(MOTION);
    function change(event: MediaQueryListEvent) {
      if (event.matches) {
        const current = clock.current;
        const { at } = flashFrame(current.elapsed, current.fixed);
        update(at < 0 ? infraredView() : still(at, current.phase === "replay" ? "inspect" : current.phase));
      }
    }
    motion.addEventListener("change", change);
    return () => motion.removeEventListener("change", change);
  }, []);

  useLayoutEffect(() => {
    onView({
      kind: "observation",
      ...flashGeography(flashFrame(view.elapsed, view.fixed), view.phase, !view.fixed),
      image: image ?? null,
      target: flashTarget,
      holdGeography: held.current,
      lens: flashLens,
      arrive,
    });
    remember?.({ chapter: view.phase });
  }, [view, image, arrive, onView, remember]);
  const { at } = flashFrame(view.elapsed, view.fixed);
  const before = at < 0;
  const inspecting = view.phase === "inspect";
  const first = view.phase === "first";
  const full = view.phase === "extent";
  const progress = before ? -1 : stepAt(at);
  const kept =
    reading &&
    navigation?.library.saved.some(
      ({ position }) =>
        position.moment?.id === "megaflash" &&
        position.moment.chapter === "inspect" &&
        position.moment.at === Math.round(flashStart + at),
    );
  useStoryCompletion((inspecting && at > 0) || first || full);
  const scanCaption = before
    ? waiting
      ? "Preparing the infrared scan…"
      : image
        ? `GOES-16 infrared · ${scan.slice(11, 16)} UTC · False color`
        : "Infrared image unavailable · showing the storm map"
    : "GOES-16 optical detections";

  function hold(next: Playback, freeze = ready) {
    if (freeze) {
      held.current = true;
      refreshAnnotations({ camera: "freeze" });
    }
    update(next);
  }

  function seek(step: number) {
    if (step < 0) {
      if (clock.current.phase !== "infrared") lastOptical.current = clock.current;
      hold(infraredView());
      return;
    }
    hold(step === FINAL_STEP ? overview() : still(timeAtStep(step), "inspect"));
  }

  function togglePlay() {
    const current = clock.current;
    if (current.playing) {
      hold(still(flashFrame(current.elapsed, current.fixed).at, "replay"));
      return;
    }
    if (current.phase === "replay" && current.fixed) {
      update({ ...current, playing: true });
    } else if (matchMedia(MOTION).matches) {
      hold({ ...still(0, "replay"), playing: true });
    } else {
      held.current = false;
      update(flight());
    }
  }

  function read(opener: HTMLButtonElement) {
    readingReturn.current = {
      frame: { ...captureReplayFrame(panel), focus: opener },
      view: { ...clock.current, playing: false },
    };
    const step = progress < 0 ? stepAt(flashFrame(lastOptical.current.elapsed, true).at) : progress;
    hold(still(timeAtStep(Math.min(step, FINAL_STEP - 1)), "inspect"), true);
    setReading(true);
    requestAnimationFrame(() => {
      const rail = document.getElementById("observatory-intro");
      if (rail) rail.scrollTop = 0;
      rail?.querySelector<HTMLButtonElement>(".reading-back")?.focus({ preventScroll: true });
    });
  }

  function closeReading() {
    const prior = readingReturn.current;
    setReading(false);
    if (!prior) return;
    hold(prior.view, true);
    restoreReplayFrame(prior.frame, panel, () => playback.current);
    readingReturn.current = undefined;
  }

  return (
    <ReplayPanel
      {...panel}
      title="Megaflash"
      className={`megaflash-journey${reading ? " flash-reading" : ""}`}
      onClose={reading ? closeReading : panel.onClose}
      closeLabel={reading ? "Back to flash" : panel.closeLabel}
      sharing={!reading}
      ending={!reading}
      deferSharedView
      finding={false}
      save={!inspecting}
      location="Southern Plains · United States"
      subtitle="GOES-16 · 22 October 2017"
      status={null}
      inset={
        <FlashWorld
          status={scanCaption}
          step={progress}
          reading={reading}
          optical={!before && view.phase !== "replay" && !first && !full}
          onSelect={seek}
        />
      }
      sources={
        <>
          <a href="https://doi.org/10.1175/BAMS-D-25-0037.1" target="_blank" rel="noreferrer">
            GLM trace · Peterson et al.
          </a>
          <a
            href="https://www.nesdis.noaa.gov/news/noaa-satellites-help-certify-worlds-longest-lightning-flash"
            target="_blank"
            rel="noreferrer"
          >
            NOAA GOES-16
          </a>
          <a
            href="https://wmo.int/news/media-centre/wmo-certifies-megaflash-lightning-record-usa"
            target="_blank"
            rel="noreferrer"
          >
            WMO certification
          </a>
        </>
      }
    >
      {reading && (
        <>
          <FlashWindow
            step={progress}
            kept={!!kept}
            {...(navigation && {
              onKeep: () => {
                const selected = navigation.current();
                if (selected) navigation.library.save(selected);
              },
            })}
          />
          {navigation?.library.notice && (
            <p className="observation-note" role="status">
              {navigation.library.notice}
            </p>
          )}
        </>
      )}
      <FlashTransport
        hidden={reading}
        progress={progress}
        first={first}
        full={full}
        before={before}
        scanning={view.phase === "infrared"}
        playing={view.playing}
        buttonRef={playback}
        onSeek={seek}
        onFirst={() => hold(opening())}
        onFull={() => hold(overview())}
        onScan={() => {
          if (view.phase === "infrared") {
            const prior = lastOptical.current;
            const { at } = flashFrame(prior.elapsed, prior.fixed);
            if (prior.phase === "replay") seek(stepAt(at));
            else hold({ ...prior, playing: false });
          } else seek(-1);
        }}
        onToggle={togglePlay}
        onRead={read}
      />
    </ReplayPanel>
  );
}
