import { foldCurtainAnnotation, refreshAnnotations } from "../../globe/annotationInput";
import type { FloatDiveView } from "../float/floatPlayback";

export function foldDeparture(
  float: FloatDiveView | null,
  curtain: boolean,
  pending: { current: (() => void) | undefined },
  advance: () => void,
) {
  const waterline = float && float.read().stage !== "locate";
  if ((!waterline && !curtain) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const complete = () => {
    clearTimeout(deadline);
    if (pending.current === complete) advance();
  };
  const deadline = window.setTimeout(complete, 1600);
  pending.current = complete;
  if (waterline) {
    float.foldToSurface(complete);
    refreshAnnotations();
    return "waterline";
  }
  if (foldCurtainAnnotation(complete)) return "curtain";
  clearTimeout(deadline);
  pending.current = undefined;
}
