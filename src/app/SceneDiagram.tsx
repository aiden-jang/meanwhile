import type { EarthScene } from "./useObservatory";

export function SceneDiagram({ scene }: { scene: EarthScene | null }): JSX.Element {
  return (
    <svg
      viewBox="0 0 32 24"
      className="scene-symbol"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      {scene === null ? (
        <path d="M7.5 5h6v6h-6zm11 0h6v6h-6zm-11 9h6v6h-6zm11 0h6v6h-6z" />
      ) : scene === "live" ? (
        <>
          <circle cx="16" cy="12" r="9" />
          <ellipse cx="16" cy="12" rx="4.5" ry="9" />
          <path d="M7 12h18" opacity=".65" />
          <path d="M16 12l6.4-6.4" className="scene-diagram-trace" pathLength="1" />
        </>
      ) : scene === "depth" ? (
        <>
          <path d="M16 21a9 9 0 1 1 8.7-11.3L16 12v9Z" />
          <path d="m16 12 10-3v9l-10 3m0-5 10-3" className="scene-diagram-trace" pathLength="1" />
        </>
      ) : (
        <>
          <path d="M4 21c6-6 18-6 24 0" />
          <path
            d="M21 11.4a5.5 5.5 0 0 1-6.5-7.8 5.5 5.5 0 1 0 6.5 7.8Z"
            className="scene-diagram-trace"
            pathLength="1"
          />
        </>
      )}
    </svg>
  );
}
