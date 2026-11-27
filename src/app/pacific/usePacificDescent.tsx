import { useCallback, useEffect, useRef, useState } from "react";
import type { CameraState } from "../../globe/controls";
import type { useGlobeCamera } from "../useGlobeCamera";
import type { useObservatory } from "../useObservatory";
import type { StoryMoment } from "../observations/storyMoment";
import type { WorldSubject } from "../continuity/worldSubject";
import { sceneEntry } from "../continuity/sceneEntry";
import { pacificId, pacificMoment, readPacificPosition, type PacificPosition } from "./pacificMoment";
import type { PacificDescent as Descent } from "./PacificDescent";

type Visit = { origin: CameraState; map: boolean; position: PacificPosition; Scene: typeof Descent };
export interface PacificEntry {
  visible: boolean;
  loading: boolean;
  status: string;
  current: () => StoryMoment | undefined;
  open: (button?: HTMLElement | null, at?: StoryMoment) => void;
}
type ContinueAt = (subject: WorldSubject, opener?: HTMLElement, leave?: () => void, map?: boolean) => void;

export function usePacificDescent(
  { world, camera: sharedCamera }: Pick<ReturnType<typeof useGlobeCamera>, "world" | "camera">,
  { checkpoint, ready }: Pick<ReturnType<typeof useObservatory>, "checkpoint" | "ready">,
  map: boolean,
  linked?: StoryMoment,
) {
  const [visit, setVisit] = useState<Visit | null>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const loading = useRef(false);
  const initialLink = useRef(linked?.id === pacificId ? linked : undefined);
  const progress = useRef<PacificPosition>(readPacificPosition());

  const open = useCallback(
    async (button?: HTMLElement | null, at?: StoryMoment) => {
      const surface = world.current;
      if (!surface || loading.current) return;
      loading.current = true;
      button?.focus({ preventScroll: true });
      checkpoint.current();
      const entry = sceneEntry();
      const origin = surface.controls.state();
      surface.controls.setView(origin);
      surface.wake();
      sharedCamera.current = origin;
      setFailed(false);
      setPending(true);
      try {
        const { PacificDescent: Scene, preparePacificArt } = await import("./PacificDescent");
        await preparePacificArt();
        if (entry?.id !== sceneEntry()?.id || surface !== world.current) return;
        progress.current = readPacificPosition(at);
        setVisit({ origin, map: at?.map ?? map, position: progress.current, Scene });
      } catch {
        setFailed(true);
      } finally {
        initialLink.current = undefined;
        loading.current = false;
        setPending(false);
      }
    },
    [world, sharedCamera, checkpoint, map],
  );

  useEffect(() => {
    if (ready && initialLink.current) void open(null, initialLink.current);
  }, [ready, open]);

  function restore(saved: Visit | null) {
    if (saved) progress.current = saved.position;
    setVisit(saved);
  }
  const current = () => (visit ? pacificMoment(progress.current, visit.map) : initialLink.current);
  return {
    active: pending || visit !== null,
    visible: visit !== null,
    projection: visit?.map,
    loading: pending,
    status: failed ? "Couldn’t open. Try again." : pending ? "Opening the descent…" : "",
    current,
    open: (button?: HTMLElement | null, at?: StoryMoment) => void open(button, at),
    history: {
      key: visit ? pacificId : "",
      capture: () => (visit ? { ...visit, position: progress.current } : null),
      restore,
    },
    surface: (continueAt: ContinueAt) =>
      visit && (
        <visit.Scene
          world={world}
          origin={visit.origin}
          initial={visit.position}
          current={current}
          onProgress={(position) => {
            progress.current = position;
          }}
          onBack={() => history.back()}
          onSurface={(subject, opener) => continueAt(subject, opener, () => restore(null), visit.map)}
        />
      ),
  };
}
