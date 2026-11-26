import { flashStart } from "./flashGlobe";
import { flashAnchors, markedDetection, seconds, windowAtStep } from "./flashReadings";

export function FlashWindow({ step, kept, onKeep }: { step: number; kept: boolean; onKeep?: () => void }) {
  const { start, end, count } = windowAtStep(step);
  const anchor = flashAnchors.find((point) => point.step === step);
  const detection = markedDetection(step);
  const time = new Date(flashStart + start).toISOString();
  return (
    <section className="flash-instrument flash-window" aria-label="Optical detection window">
      <h3>{anchor?.title ?? "Optical pulse"}</h3>
      <p>GOES-16 optical detections</p>
      <dl>
        <div>
          <dt>Time after first light</dt>
          <dd>
            {seconds(start)}–{seconds(end)} s
          </dd>
        </div>
        <div>
          <dt>UTC at window start</dt>
          <dd>
            <time dateTime={time}>{time.slice(11, 23)}</time>
          </dd>
        </div>
        <div>
          <dt>Trace samples in window</dt>
          <dd>{count}</dd>
        </div>
        {detection && (
          <div>
            <dt>Approx. sample location</dt>
            <dd>
              {detection[2].toFixed(2)}° N · {Math.abs(detection[1]).toFixed(2)}° W
            </dd>
          </div>
        )}
      </dl>
      <p>
        Each point samples the published GOES-16 optical trace. Several parts of the storm can light up in the
        same window.
      </p>
      {onKeep && (
        <button className="flash-open" type="button" disabled={kept} onClick={onKeep}>
          {kept ? "Reading kept" : "Keep this reading"}
        </button>
      )}
    </section>
  );
}
