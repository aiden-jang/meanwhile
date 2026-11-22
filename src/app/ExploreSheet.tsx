import { useLayoutEffect, useState } from "react";
import { Resizer } from "./Resizer";
import { MobileNavigation } from "./MobileNavigation";
import { sheetStops } from "./sheetLayout";
import { useStoryNavigation } from "./journeys/StoryNavigation";

export function ExploreSheet({
  height,
  onResize,
  panel,
  visible,
  flat,
}: {
  height: number;
  onResize: (height: number) => void;
  panel: string;
  visible: boolean;
  flat: boolean;
}) {
  const [viewport, setViewport] = useState({ height: window.innerHeight, footer: 0 });
  const preview = useStoryNavigation()?.previewOpen;
  const [previewHeight, setPreviewHeight] = useState<number>();
  useLayoutEffect(() => {
    const resize = () => {
      const rail = document.getElementById("chrome-rail");
      setViewport({
        height: window.innerHeight,
        footer: rail ? parseFloat(getComputedStyle(rail).marginBottom) || 0 : 0,
      });
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const stops = sheetStops(viewport.height, viewport.footer);
  const [first, half, last] = stops;
  useLayoutEffect(() => {
    const zones = document.querySelector<HTMLElement>(".zones");
    if (!zones) return;
    zones.style.setProperty("--sheet-min", `${first}px`);
    zones.style.setProperty("--sheet-default", `${half}px`);
    zones.style.setProperty("--sheet-max", `${last}px`);
    return () => {
      for (const name of ["--sheet-min", "--sheet-default", "--sheet-max"]) zones.style.removeProperty(name);
    };
  }, [first, half, last]);
  const current = preview
    ? (previewHeight ?? Math.min(last, Math.max(height || half, Math.min(half + 100, last - 56))))
    : Math.min(last, Math.max(first, height || half));
  useLayoutEffect(() => {
    if (!preview) {
      setPreviewHeight(undefined);
      return;
    }
    const zones = document.querySelector<HTMLElement>(".zones");
    zones?.style.setProperty("--preview-sheet", `${current}px`);
    return () => {
      zones?.style.removeProperty("--preview-sheet");
    };
  }, [preview, current]);
  const resizeSheet = preview ? setPreviewHeight : onResize;
  return (
    <>
      <Resizer
        axis="y"
        label="Sheet height"
        value={current}
        min={stops[0]!}
        max={stops[2]!}
        snap={stops}
        measure={(event) => event.clientY}
        onChange={resizeSheet}
        grip
        className={visible ? "absolute inset-x-0 z-[2] md:hidden" : "hidden"}
        style={{ top: "calc(var(--sheet-position) - 6px)" }}
      />
      {visible && (
        <MobileNavigation
          canvasHeight={current}
          stops={stops}
          onResize={resizeSheet}
          panel={panel}
          flat={flat}
        />
      )}
    </>
  );
}
