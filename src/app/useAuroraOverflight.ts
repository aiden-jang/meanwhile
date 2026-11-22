import { useCallback, useMemo } from "react";
import type { Aurora } from "../sources/aurora";
import { auroraRoutes, currentForecast, type AuroraRun, type Hemisphere } from "../sources/auroraRoute";
import { useRestoreAurora } from "./useLinkedAurora";
import type { StoryMoment } from "./observations/storyMoment";
import type { LayerAnswer } from "./feedStatus";

export function useAuroraOverflight(
  forecast: Aurora | null,
  answer: LayerAnswer,
  active: {
    request: StoryMoment | null;
    setRequest: (moment: StoryMoment | null) => void;
    run: AuroraRun | null;
    setRun: (run: AuroraRun | null) => void;
  },
  enabled: boolean,
  now: number,
) {
  const { run, setRun } = active;
  const current = enabled && forecast !== null && currentForecast(forecast, now) ? forecast : null;
  const routes = useMemo(() => (current ? auroraRoutes(current) : []), [current]);
  const unavailable = !enabled
    ? "Return to live Earth for the current forecast."
    : answer === "pending"
      ? "Loading NOAA’s aurora forecast…"
      : !forecast
        ? "NOAA’s aurora forecast is unavailable."
        : forecast.estimatedTime
          ? "Forecast time unavailable."
          : !current
            ? forecast.forecastAt < now
              ? "The latest aurora forecast has expired."
              : "The forecast is too far ahead for this view."
            : routes.length === 0
              ? "No forecast aurora on Earth’s night side."
              : null;

  const start = useCallback(
    (hemisphere?: Hemisphere, held = false) => {
      const route = routes.find((entry) => entry.hemisphere === hemisphere) ?? routes[0];
      if (route && current) setRun({ forecast: current, route, ...(held ? { held: true } : {}) });
    },
    [current, routes, setRun],
  );
  useRestoreAurora(active.request, run, current?.forecastAt, start);
  return {
    run,
    requested: !!active.request,
    hold: active.setRequest,
    newerForecast:
      active.request?.at !== undefined && run !== null && run.forecast.forecastAt !== active.request.at,
    forecastAt: current?.forecastAt,
    unavailable,
    routes,
    start,
    replay() {
      if (run) setRun({ forecast: run.forecast, route: { ...run.route } });
    },
  };
}
