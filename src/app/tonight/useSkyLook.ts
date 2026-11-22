import { useCallback, useEffect, useRef, type KeyboardEvent } from "react";
import type { SkyLook, TonightView } from "../../geo/tonight";

export function manualSkyLook(view: TonightView, look: SkyLook): TonightView {
  return { ...view, look, nightTrail: view.nightTrail && { ...view.nightTrail, following: false } };
}

const arrows: Record<string, readonly [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
};

export function useSkyLook(view: TonightView | null, onView: (view: TonightView) => void, enabled: boolean) {
  const latest = useRef({ view, onView });
  latest.current = { view, onView };
  const turn = useCallback((yaw: number, pitch: number) => {
    const { view, onView } = latest.current;
    if (!view || (!yaw && !pitch)) return;
    const next = manualSkyLook(view, {
      azimuth: (((view.look.azimuth + yaw) % 360) + 360) % 360,
      altitude: Math.max(0, Math.min(88, view.look.altitude + pitch)),
    });
    latest.current.view = next;
    onView(next);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const globe = document.getElementById("globe-view");
    if (!globe) return;
    let pointer: { id: number; x: number; y: number; scale: number; moved: boolean } | null = null;
    let yaw = 0;
    let pitch = 0;
    let frame = 0;
    const flush = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      turn(yaw, pitch);
      yaw = pitch = 0;
    };
    const down = (event: PointerEvent) => {
      const canvas = event.target;
      if (pointer || !event.isPrimary || event.button !== 0 || !(canvas instanceof HTMLCanvasElement)) return;
      pointer = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        scale: 64 / Math.max(240, canvas.clientHeight),
        moved: false,
      };
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        pointer = null;
      }
    };
    const move = (event: PointerEvent) => {
      if (pointer?.id !== event.pointerId) return;
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;
      if (!pointer.moved && Math.hypot(dx, dy) < 4) return;
      pointer.moved = true;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      yaw -= dx * pointer.scale;
      pitch += dy * pointer.scale;
      if (!frame) frame = requestAnimationFrame(flush);
    };
    const release = (event: PointerEvent) => {
      if (pointer?.id !== event.pointerId) return;
      pointer = null;
      flush();
    };
    globe.addEventListener("pointerdown", down);
    globe.addEventListener("pointermove", move);
    globe.addEventListener("pointerup", release);
    globe.addEventListener("pointercancel", release);
    globe.addEventListener("lostpointercapture", release);
    return () => {
      globe.removeEventListener("pointerdown", down);
      globe.removeEventListener("pointermove", move);
      globe.removeEventListener("pointerup", release);
      globe.removeEventListener("pointercancel", release);
      globe.removeEventListener("lostpointercapture", release);
      cancelAnimationFrame(frame);
    };
  }, [enabled, turn]);

  return (event: KeyboardEvent<HTMLElement>) => {
    if (!enabled || event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey)
      return;
    const direction = arrows[event.key];
    if (!direction) return;
    const degrees = event.shiftKey ? 18 : 6;
    event.preventDefault();
    turn(direction[0] * degrees, direction[1] * degrees);
  };
}
