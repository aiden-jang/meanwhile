import { useId, useMemo } from "react";
import type { ArgoProfile } from "../../sources/argo";

export function FloatWorldProfile({ samples, index }: { samples: ArgoProfile["samples"]; index: number }) {
  const name = useId();
  const { points, ticks, low, high } = useMemo(() => {
    const temperatures = samples.map(({ temperature }) => temperature);
    const low = Math.floor(Math.min(...temperatures));
    const high = Math.max(low + 1, Math.ceil(Math.max(...temperatures)));
    const deepest = samples[0]!.depth;
    const shallowest = samples.at(-1)!.depth;
    return {
      low,
      high,
      points: samples.map(({ depth, temperature }) => ({
        x: 2 + (96 * (temperature - low)) / (high - low),
        y: (100 * (depth - shallowest)) / (deepest - shallowest),
      })),
      ticks: [0, 0.25, 0.5, 0.75, 1].map((part) => Math.round(shallowest + (deepest - shallowest) * part)),
    };
  }, [samples]);
  const path = useMemo(() => points.map(({ x, y }) => `${x},${y}`).join(" "), [points]);
  const cursor = points[index]!;
  return (
    <div className="float-depth-track" data-float-depth-track="">
      <div className="float-depth-guides" aria-hidden="true">
        {ticks.map((depth, i) => (
          <div key={depth} style={{ top: `${25 * i}%` }}>
            <span>{i === 0 ? "Surface" : `${depth.toLocaleString()} m`}</span>
          </div>
        ))}
        <i style={{ top: `${cursor.y}%` }} />
      </div>
      <div className="float-world-chart">
        <div className="float-world-chart-label" aria-hidden="true">
          <span>Temperature</span>
          <span>
            {low}–{high} °C
          </span>
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-labelledby={name}>
          <title id={name}>
            Measured temperature by estimated depth, {low} to {high} degrees Celsius
          </title>
          <polyline fill="none" vectorEffect="non-scaling-stroke" points={path} />
        </svg>
        <i className="float-world-chart-sample" style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }} />
      </div>
    </div>
  );
}
