import type { PointerEvent } from "react";

export type LidarCursor = readonly [along: number, altitude: number];
const center: LidarCursor = [50, 50];
const percent = (value: number) => Math.max(0, Math.min(100, Math.round(value * 100)));
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
  const [along, altitude] = cursor ?? center;
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
          select(cursor ? null : center);
        }}
      >
        Read the lidar profile
      </summary>
      <div
        className="lidar-plot"
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
        <span
          aria-hidden="true"
          className="lidar-cursor"
          style={{ left: `${along}%`, bottom: `${altitude}%` }}
        />
      </div>
      <label className="lidar-altitude">
        <span>Profile altitude</span>
        <output>{height(altitude)}</output>
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
    </details>
  );
}
