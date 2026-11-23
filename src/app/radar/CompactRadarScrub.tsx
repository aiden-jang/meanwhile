import type { ReactNode } from "react";

const clock = (at: number) => new Date(at).toISOString().slice(11, 16);

export function CompactRadarScrub({
  id,
  selected,
  first,
  shown,
  latest,
  expired,
  timeline,
  status,
  retry,
  provider,
  follow,
}: {
  id: string;
  selected?: number | undefined;
  first?: number | undefined;
  shown?: number | undefined;
  latest: boolean;
  expired: boolean;
  timeline: ReactNode;
  status: ReactNode;
  retry?: (() => void) | undefined;
  provider: string;
  follow: () => void;
}) {
  return (
    <div className="entry-scrub">
      <div className="entry-scrub-label">
        <label htmlFor={id}>Scrub the radar</label>
        {selected !== undefined && (
          <time dateTime={new Date(selected).toISOString()}>{clock(selected)} UTC</time>
        )}
      </div>
      {timeline}
      <div className="entry-scrub-ends">
        <span>{first === undefined ? "" : clock(first)}</span>
        <button
          type="button"
          className="radar-latest"
          aria-pressed={latest}
          disabled={selected === undefined}
          onClick={follow}
        >
          Latest
        </button>
      </div>
      {(status || shown !== undefined || expired) && (
        <p role="status" aria-label="Radar status">
          {expired ? "The saved scan expired. Showing the latest available scan. " : null}
          {shown !== undefined && `Still showing ${clock(shown)} UTC. `}
          {status}
        </p>
      )}
      {retry && (
        <button type="button" className="radar-retry" onClick={retry}>
          Retry {provider}
        </button>
      )}
    </div>
  );
}
