import { useSyncExternalStore, type RefObject } from "react";
import { ARGO_DOI } from "../../sources/argo";
import { ShareMoment } from "../observations/StorySession";
import { FloatObservation } from "./FloatObservation";
import { floatMoment } from "./floatMoment";
import type { FloatDiveView } from "./floatPlayback";

const date = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

function Instrument({ view, map }: { view: FloatDiveView; map: boolean }) {
  const { index } = useSyncExternalStore(view.subscribe, view.read);
  const sample = view.profile.samples[index]!;
  return (
    <>
      <p className="float-explore-date">
        <time dateTime={new Date(view.profile.at).toISOString()}>{date.format(view.profile.at)}</time>
        {" · Argo "}
        {view.profile.wmo}
        {" · Cycle "}
        {view.profile.cycle}
      </p>
      <dl className="float-explore-metrics">
        <div>
          <dt>Estimated depth</dt>
          <dd data-float-depth>
            {Math.round(sample.depth).toLocaleString()} <small>m</small>
          </dd>
        </div>
        <div>
          <dt>Temperature</dt>
          <dd>{sample.temperature.toFixed(2)} °C</dd>
        </div>
        <div>
          <dt>Practical salinity</dt>
          <dd>{sample.salinity.toFixed(3)}</dd>
        </div>
      </dl>
      <p className="float-explore-hint">
        <strong>Drag the float</strong> to change depth.
        <span className="float-explore-keys"> Use the arrow keys when it’s focused.</span>
      </p>
      <details className="float-explore-details">
        <summary>Profile &amp; source</summary>
        <p>
          Temperature and salinity are measured. Depth is estimated from pressure. The water column is
          illustrated.
        </p>
        <p className="float-source">
          <a href={ARGO_DOI} target="_blank" rel="noreferrer" aria-describedby="external-link-hint">
            Argo data
          </a>
        </p>
        <FloatObservation view={view} />
        <ShareMoment current={() => floatMoment(view, map)} />
      </details>
    </>
  );
}

export function FloatExploreReading({
  view,
  map,
  back,
  onClose,
  returnLabel,
}: {
  view: FloatDiveView | null;
  map: boolean;
  back: RefObject<HTMLButtonElement>;
  onClose: () => void;
  returnLabel: string;
}) {
  return (
    <div className="float-explore-reading">
      <button type="button" className="reading-back" ref={back} onClick={onClose}>
        {returnLabel}
      </button>
      <h2>Float Dive</h2>
      <p className="float-explore-description">
        An Argo float measured the water as it rose through the Labrador Sea.
      </p>
      {view ? <Instrument view={view} map={map} /> : <p role="status">Opening the recorded profile…</p>}
    </div>
  );
}
