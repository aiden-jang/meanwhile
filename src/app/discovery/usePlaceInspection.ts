import { useCallback, useState } from "react";

export type ExplorePoint = { lon: number; lat: number; name?: string };

export function usePlaceInspection(showPanel: (on: boolean) => void, initial?: ExplorePoint) {
  const [point, setPoint] = useState<ExplorePoint | null>(initial ?? null);
  const open = useCallback(
    (point: ExplorePoint) => {
      showPanel(true);
      setPoint(point);
    },
    [showPanel],
  );
  return { point, open, close: () => setPoint(null), restore: setPoint };
}
