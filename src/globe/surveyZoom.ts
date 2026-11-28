import type { ObservationView } from "../app/observations/types";

export function createSurveyZoom() {
  let lens: ObservationView["lens"];
  let approach = 0;
  let startingLens = 1;
  let visibleLens = 1;
  let exit: { from: number; progress: number; complete?: () => void } | undefined;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  function finish() {
    const done = exit?.complete;
    if (exit) {
      exit.progress = 1;
      delete exit.complete;
    }
    done?.();
  }
  function finishIfHidden() {
    if (document.hidden) finish();
  }
  document.addEventListener("visibilitychange", finishIfHidden);
  return {
    set(next: typeof lens) {
      if (lens === next) return;
      startingLens = lens?.approachSeconds && next?.approachSeconds ? visibleLens : 1;
      approach = 0;
      exit = undefined;
      lens = next;
    },
    release(complete: () => void) {
      if (exit) return true;
      if (!lens?.approachSeconds || visibleLens < 1.05 || document.hidden || reducedMotion.matches)
        return false;
      exit = { from: visibleLens, progress: 0, complete };
      return true;
    },
    step(dt: number, elapsed: number, reduced: boolean, arrived: boolean, holding: boolean) {
      if (exit) {
        if (exit.progress < 1) {
          exit.progress = reduced ? 1 : Math.min(1, exit.progress + elapsed / 0.86);
          if (exit.progress === 1) finish();
        }
        return exit.progress < 1;
      }
      if (lens && arrived) {
        const duration = startingLens !== 1 ? 0.45 : (lens.approachSeconds ?? 0.65);
        approach = reduced ? 1 : Math.min(1, approach + dt / duration);
      }
      return !!lens && approach < 1 && (!holding || arrived);
    },
    ready: () => !lens || approach === 1,
    magnification(morph: number, aspect: number) {
      const target = lens ? (lens.globe + (lens.map - lens.globe) * morph) * Math.min(1, aspect) : 1;
      const progress = exit?.progress ?? approach;
      const eased = progress * progress * (3 - 2 * progress);
      visibleLens = exit ? exit.from ** (1 - eased) : startingLens * (target / startingLens) ** eased;
      return visibleLens;
    },
    dispose() {
      document.removeEventListener("visibilitychange", finishIfHidden);
    },
  };
}
