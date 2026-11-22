import { useRef } from "react";
import type { ObservatoryProps } from "../Observatory";

export function useAfterDarkSky({
  explorer,
  views,
  tour,
  aurora,
}: Pick<ObservatoryProps, "explorer" | "views" | "tour" | "aurora">) {
  const { navigation, tonight, observations, sun } = views;
  const origin = useRef<{
    state: ReturnType<typeof navigation.capture>;
    camera: ReturnType<typeof explorer.read>;
    revision: number;
    scroll: number;
    label: string;
  }>();
  const prior =
    tonight.active && origin.current?.revision === tonight.entry.revision ? origin.current : undefined;
  return {
    label: prior?.label,
    open() {
      origin.current =
        aurora.run || sun.active
          ? {
              state: navigation.capture(),
              camera: explorer.read(),
              revision: tonight.entry.revision + 1,
              scroll: tour.controls.current?.scrollTop ?? 0,
              label: sun.active ? "Back to Sun Watch" : "Back to Aurora Overflight",
            }
          : undefined;
      observations.setMap(false);
      tonight.open();
    },
    close: prior
      ? () => {
          origin.current = undefined;
          navigation.restore(prior.state);
          explorer.restore(prior.camera);
          requestAnimationFrame(() => {
            tour.controls.current?.scrollTo(0, prior.scroll);
            document.getElementById("open-tonight-sky")?.focus({ preventScroll: true });
          });
        }
      : undefined,
  };
}
