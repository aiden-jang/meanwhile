import { useEffect, useRef, useSyncExternalStore } from "react";

// Only the mounted journey owns this bridge to the shared globe's camera control.
let owner: { resume: () => void; interrupted: boolean } | null = null;
const listeners = new Set<() => void>();
const publish = () => listeners.forEach((listener) => listener());
const read = () => owner?.interrupted ?? false;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export function useInterruptedJourney() {
  const interrupted = useSyncExternalStore(subscribe, read);
  return { interrupted, resume: () => owner?.resume() };
}

export function useJourneyGestures(pause: () => void, resume: () => void, canResume: boolean, active = true) {
  const actions = useRef({ pause, resume });
  actions.current = { pause, resume };
  useEffect(() => {
    if (!active) return;
    const control = {
      interrupted: false,
      resume() {
        control.interrupted = false;
        actions.current.resume();
        publish();
      },
    };
    owner = control;
    publish();
    const canvas = document.querySelector<HTMLCanvasElement>("#globe-view canvas");
    const globe = document.getElementById("globe-view");
    const stop = () => {
      actions.current.pause();
      control.interrupted = canResume;
      publish();
    };
    const key = (event: KeyboardEvent) => {
      const active = document.activeElement;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (active && active !== document.body && active !== globe) return;
      if (/^(Arrow(Left|Right|Up|Down)|[+\-_=])$/.test(event.key)) stop();
    };
    let press: { id: number; x: number; y: number } | undefined;
    const down = (event: PointerEvent) => {
      if (event.isPrimary && event.button === 0)
        press = { id: event.pointerId, x: event.clientX, y: event.clientY };
    };
    const move = (event: PointerEvent) => {
      if (press?.id !== event.pointerId || Math.hypot(event.clientX - press.x, event.clientY - press.y) < 4)
        return;
      press = undefined;
      stop();
    };
    const up = () => {
      press = undefined;
    };
    canvas?.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    canvas?.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("keydown", key);
    return () => {
      canvas?.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      canvas?.removeEventListener("wheel", stop);
      window.removeEventListener("keydown", key);
      if (owner === control) {
        owner = null;
        publish();
      }
    };
  }, [active, canResume]);
}
