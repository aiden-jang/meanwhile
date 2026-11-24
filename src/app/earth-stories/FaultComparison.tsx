import { refreshAnnotations } from "../../globe/annotationInput";
import type { ReplayProps } from "../observations/RecordedReplay";
import type { EarthStoryData, StorySite } from "./types";

export function FaultComparison({
  data,
  selected,
  at,
  seek,
  readCamera,
  restoreCamera,
}: Pick<ReplayProps, "readCamera" | "restoreCamera"> & {
  data: EarthStoryData;
  selected: StorySite | undefined;
  at: number;
  seek: (index: number) => void;
}) {
  const radar = data.frames.length - 1;
  const terrain = selected ? data.frames.findIndex((frame) => frame.at === selected.at) : 1;
  const radarVisible = data.frames[radar]!.at === at;
  const [measurement, survey] = selected?.value.split(" horizontal offset · ") ?? [];
  const show = (index: number) => {
    refreshAnnotations({ camera: "hold" });
    const camera = readCamera?.();
    if (camera) restoreCamera?.(camera);
    seek(index);
  };
  return (
    <section className="terrain-comparison" aria-label="Ridgecrest comparison">
      <div className="observatory-actions" role="group" aria-label="Terrain and radar">
        <button type="button" aria-pressed={!radarVisible} onClick={() => radarVisible && show(terrain)}>
          Shaded terrain
        </button>
        <button
          type="button"
          aria-pressed={radarVisible}
          onClick={(event) => {
            event.currentTarget.focus({ preventScroll: true });
            show(radar);
          }}
        >
          Radar displacement
        </button>
      </div>
      {selected && (
        <div className="fault-site-reading" role="status">
          <strong>{measurement}</strong>
          <span>
            {selected.label}
            {survey && ` · ${survey}`}
          </span>
        </div>
      )}
      {(radarVisible || !selected) && (
        <p className="observation-note">
          {radarVisible
            ? "Each radar color cycle is 11.45 cm of line-of-sight change across both earthquakes."
            : "Pick a survey site to read the measured horizontal offset."}
        </p>
      )}
    </section>
  );
}
