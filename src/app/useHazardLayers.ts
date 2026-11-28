import { useEffect, useRef, useState } from "react";
import { fetchAurora, type Aurora } from "../sources/aurora";
import { fetchCyclones, type Cyclone } from "../sources/cyclones";
import { fetchFloods, type Flood } from "../sources/floods";
import { fetchVolcanoes, type Volcano } from "../sources/volcanoes";
import { fetchWildfires, type Wildfire } from "../sources/wildfires";
import { timedFetch } from "../sources/types";
import type { HazardLayer } from "./format";
import type { FeedChecks, LayerAnswer } from "./feedStatus";
import { pollVisible } from "./pollVisible";

const POLL_MS = 10 * 60_000;

export interface HazardLayers {
  retry: (layer: HazardLayer) => void;
  aurora: Aurora | null;
  cyclones: readonly Cyclone[];
  fires: readonly Wildfire[];
  floods: readonly Flood[];
  volcanoes: readonly Volcano[];
  answered: Record<HazardLayer, LayerAnswer>;
  checked: FeedChecks;
}

/** The five layers that are polled rather than streamed, and whether each has been heard from. */
export function useHazardLayers(): HazardLayers {
  const retries = useRef<Partial<Record<HazardLayer, () => void>>>({});
  const [aurora, setAurora] = useState<Aurora | null>(null);
  const [cyclones, setCyclones] = useState<readonly Cyclone[]>([]);
  /* Both parsers must filter on their own dates, not on `iscurrent`. Measured: every fire is flagged
  current, and 81 of a hundred floods were up to a year old. */
  const [fires, setFires] = useState<readonly Wildfire[]>([]);
  const [floods, setFloods] = useState<readonly Flood[]>([]);
  const [volcanoes, setVolcanoes] = useState<readonly Volcano[]>([]);
  const [health, setHealth] = useState<{ answered: Record<HazardLayer, LayerAnswer>; checked: FeedChecks }>({
    answered: {
      cyclones: "pending",
      volcanoes: "pending",
      fires: "pending",
      floods: "pending",
      aurora: "pending",
    },
    checked: {},
  });

  useEffect(() => {
    async function refresh<T>(
      signal: AbortSignal,
      layer: HazardLayer,
      fetchLayer: (get: (url: string) => Promise<Response>, onAnswer: (ok: boolean) => void) => Promise<T>,
      apply: (next: T) => void,
    ) {
      let answered = false;
      const next = await fetchLayer(
        (url) => timedFetch(url, signal),
        (ok) => {
          if (signal.aborted) return;
          answered = ok;
          const at = Date.now();
          setHealth((old) => ({
            answered: { ...old.answered, [layer]: ok ? "ok" : "failed" },
            checked: ok ? { ...old.checked, [layer]: at } : old.checked,
          }));
        },
      );
      if (answered && !signal.aborted) apply(next);
    }
    function poll<T>(
      layer: HazardLayer,
      fetchLayer: Parameters<typeof refresh<T>>[2],
      apply: (next: T) => void,
      interval = POLL_MS,
    ) {
      const request = pollVisible((signal) => refresh(signal, layer, fetchLayer, apply), interval);
      retries.current[layer] = request.retry;
      return request;
    }
    const requests = [
      poll("aurora", fetchAurora, setAurora),
      poll("cyclones", fetchCyclones, setCyclones),
      poll("fires", fetchWildfires, setFires),
      poll("floods", fetchFloods, setFloods),
      poll("volcanoes", fetchVolcanoes, setVolcanoes, 6 * 60 * 60_000),
    ];
    return () => {
      for (const stop of requests) stop();
      retries.current = {};
    };
  }, []);

  function retry(layer: HazardLayer) {
    if (health.answered[layer] !== "failed") return;
    setHealth((old) => ({ ...old, answered: { ...old.answered, [layer]: "pending" } }));
    retries.current[layer]?.();
  }
  return { aurora, cyclones, fires, floods, volcanoes, ...health, retry };
}
