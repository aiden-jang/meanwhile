import { useRef, useState } from "react";
import type { CameraState } from "../../globe/controls";
import type { PassageCamera } from "../tonga/passageSurface";
import type { PacificDescent as Descent } from "./PacificDescent";

export interface PacificEntry {
  loading: boolean;
  status: string;
  open: (button: HTMLButtonElement) => void;
}

export function usePacificDescent(
  world: { current: PassageCamera | null },
  sharedCamera: { current: CameraState },
) {
  const [visit, setVisit] = useState<{ origin: CameraState; Scene: typeof Descent } | null>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const loading = useRef(false);
  const opener = useRef<HTMLButtonElement | null>(null);

  async function descend(button: HTMLButtonElement) {
    if (!world.current || loading.current) return;
    loading.current = true;
    opener.current = button;
    setFailed(false);
    setPending(true);
    const origin = world.current.controls.state();
    world.current.controls.setView(origin);
    world.current.wake();
    sharedCamera.current = origin;
    try {
      const { PacificDescent: Scene, preparePacificArt } = await import("./PacificDescent");
      await preparePacificArt();
      if (!button.isConnected || !world.current) return;
      setVisit({ origin, Scene });
    } catch {
      if (button.isConnected) setFailed(true);
    } finally {
      loading.current = false;
      setPending(false);
    }
  }

  return {
    active: pending || visit !== null,
    visible: visit !== null,
    loading: pending,
    status: failed ? "Couldn’t open. Try again." : pending ? "Opening the descent…" : "",
    open: (button: HTMLButtonElement) => void descend(button),
    surface: visit && (
      <visit.Scene
        world={world}
        origin={visit.origin}
        onBack={() => {
          setVisit(null);
          requestAnimationFrame(() => opener.current?.focus({ preventScroll: true }));
        }}
      />
    ),
  };
}
