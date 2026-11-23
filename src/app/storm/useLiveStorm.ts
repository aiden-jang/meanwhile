import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchCycloneAdvisories, type CycloneFix } from "../../sources/cycloneAdvisories";
import type { Cyclone } from "../../sources/cyclones";
import type { ObservationView } from "../observations/types";

type Load = { id: string; episode: string; fixes: CycloneFix[]; failed: boolean };
type Point = Pick<CycloneFix, "lon" | "lat">;
const amber = 0xf5ce93;

export function useLiveStorm(storm: Cyclone | undefined) {
  const id = storm?.id;
  const episode = storm?.episode;
  const source = storm?.source ?? null;
  const [load, setLoad] = useState<Load>();
  const [picked, setPicked] = useState<{ id: string; point: CycloneFix }>();
  useEffect(() => {
    if (!id) {
      setPicked(undefined);
      return;
    }
    if (!episode) return;
    const request = new AbortController();
    void fetchCycloneAdvisories(id, episode, source, request.signal).then(
      (fixes) => {
        if (!request.signal.aborted) setLoad({ id, episode, fixes, failed: false });
      },
      () => {
        if (!request.signal.aborted)
          setLoad((previous) => ({
            id,
            episode,
            fixes: previous?.id === id ? previous.fixes : [],
            failed: true,
          }));
      },
    );
    return () => request.abort();
  }, [id, episode, source]);

  const loading = !!episode && (load?.id !== id || load?.episode !== episode);
  const reported = load?.id === id ? load?.fixes : undefined;
  const fixes = useMemo(() => {
    if (reported?.length) return reported;
    if (!storm) return [];
    const points: readonly Point[] = storm.track.length ? storm.track : [storm];
    return points.map(({ lon, lat }) => ({
      lon,
      lat,
      at: lon === storm.lon && lat === storm.lat ? storm.endedAt : null,
      windKmh: null,
      pressureHpa: null,
    }));
  }, [storm, reported]);
  const prior = picked?.id === id ? picked?.point : undefined;
  const saved = prior
    ? fixes.findIndex((fix) =>
        prior.at !== null && fix.at !== null
          ? prior.at === fix.at
          : Math.abs(fix.lon - prior.lon) < 0.06 && Math.abs(fix.lat - prior.lat) < 0.06,
      )
    : -1;
  const index = saved >= 0 ? saved : fixes.length - 1;
  const point = fixes[index];
  const select = useCallback(
    (next: number) => {
      const fix = fixes[next];
      if (id && fix) setPicked({ id, point: fix });
    },
    [fixes, id],
  );

  const paths = useMemo(
    () => (fixes.length > 1 ? [{ points: fixes, color: amber, trace: !loading }] : []),
    [fixes, loading],
  );
  const overlay = useMemo<ObservationView | null>(() => {
    if (!storm || !point) return null;
    return {
      kind: "observation",
      cameraKey: `live-cyclone-${storm.id}`,
      target: { lon: storm.lon, lat: storm.lat, zoom: 2.2 },
      image: null,
      pickMarks: { points: fixes, select },
      frame: {
        at: point.at ?? storm.endedAt ?? 0,
        paths,
        flow: true,
        marks: fixes.map((fix, i) => ({
          ...fix,
          color: i === index ? amber : 0xe5eef1,
          size: i === index ? 19 : 9,
        })),
      },
    };
  }, [storm, point, fixes, select, paths, index]);
  if (!storm || !point) return null;
  return {
    storm,
    point,
    fixes,
    index,
    select,
    overlay,
    loading,
    failed: load?.id === id && load?.failed === true,
  };
}

export type LiveStorm = NonNullable<ReturnType<typeof useLiveStorm>>;
