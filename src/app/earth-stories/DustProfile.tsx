import type { PointerEvent } from "react";

export type LidarCursor = readonly [along: number, altitude: number];
export const middleLidarSample: LidarCursor = [50, 50];
const percent = (value: number) => Math.max(0, Math.min(100, Math.round(value * 100)));
const distance = (along: number) => `${along}% along the recorded track`;
const height = (altitude: number) => `${((15 * altitude) / 100).toFixed(1)} km altitude`;

export function readLidarCursor(chapter: string | undefined): LidarCursor | null {
  const match = /^slice:(\d{1,3}):(\d{1,3})$/.exec(chapter ?? "");
  const along = Number(match?.[1]);
  const altitude = Number(match?.[2]);
  return along <= 100 && altitude <= 100 ? [along, altitude] : null;
}

export function DustProfile({
  image,
  cursor,
  select,
}: {
  image: string;
  cursor: LidarCursor | null;
  select: (next: LidarCursor | null) => void;
}) {
  const [along, altitude] = cursor ?? middleLidarSample;
  function scrub(event: PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    select([
      percent((event.clientX - box.left) / box.width),
      percent((box.bottom - event.clientY) / box.height),
    ]);
  }
  return (
    <details className="lidar-profile" open={cursor !== null}>
      <summary
        onClick={(event) => {
          event.preventDefault();
          select(cursor ? null : middleLidarSample);
        }}
      >
        Read the lidar profile
      </summary>
      <div
        className="lidar-plot"
        style={{ "--lidar-along": `${along}%` } as React.CSSProperties}
        onPointerDown={(event) => {
          if (event.button !== 0 || !event.isPrimary) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          scrub(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) scrub(event);
        }}
      >
        <img
          src={image}
          draggable={false}
          alt="CALIPSO laser backscatter from the surface to 15 km along the Caribbean track"
        />
        <span aria-hidden="true" className="lidar-cursor" style={{ bottom: `${altitude}%` }} />
      </div>
      <p className="lidar-reading">
        <strong>{height(altitude)}</strong> <span>{distance(along)}</span>
      </p>
      <label className="lidar-altitude">
        <span>Profile altitude</span>
        <input
          className="scrub-slider"
          type="range"
          min={0}
          max={100}
          value={altitude}
          aria-label="Profile altitude"
          aria-valuetext={height(altitude)}
          onChange={(event) => select([along, event.currentTarget.valueAsNumber])}
        />
      </label>
      <label className="lidar-altitude">
        <span>Along the track</span>
        <input
          className="scrub-slider"
          type="range"
          min={0}
          max={100}
          value={along}
          aria-label="Along the track"
          aria-valuetext={distance(along)}
          onChange={(event) => select([event.currentTarget.valueAsNumber, altitude])}
        />
      </label>
    </details>
  );
}
