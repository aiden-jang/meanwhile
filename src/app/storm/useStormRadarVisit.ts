import { useCallback, useState } from "react";
import { usePanelReturn } from "../usePanelReturn";

export function useStormRadarVisit(id: string | undefined) {
  const panel = usePanelReturn();
  const rail = "chrome-rail";
  const [reading, setReading] = useState<{ id: string; at: number | null; scroll: number; open: boolean }>();
  const current = reading?.id === id ? reading : undefined;
  const select = useCallback(
    (at: number | null) => {
      if (id)
        setReading((previous) =>
          previous?.id === id ? { ...previous, at } : { id, at, open: false, scroll: 0 },
        );
    },
    [id],
  );
  if (!id) return undefined;
  return {
    at: current?.at ?? null,
    open: current?.open ?? false,
    select,
    start() {
      const scroll = document.getElementById(rail)?.scrollTop ?? 0;
      setReading({ id, at: current?.at ?? null, scroll, open: true });
      panel.restore({ scrollTarget: rail, scroll: 0, focus: "storm-radar-title" });
    },
    back() {
      setReading({ id, at: current?.at ?? null, scroll: current?.scroll ?? 0, open: false });
      panel.restore({
        scrollTarget: rail,
        scroll: current?.scroll ?? 0,
        focus: "replay-nearby-radar",
        fallback: "live-storm-title",
      });
    },
  };
}

export type StormRadarVisit = NonNullable<ReturnType<typeof useStormRadarVisit>>;
