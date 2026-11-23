import type { AuroraRun } from "../../sources/auroraRoute";
import { layerTime } from "../layerTime";

export function AuroraReading({ run }: { run: AuroraRun }) {
  const at = run.forecast.forecastAt;
  return (
    <dl className="aurora-journey-reading">
      <div>
        <dt>Model chance at this point</dt>
        <dd>{run.route.focus.probability}%</dd>
      </div>
      <div>
        <dt>Forecast valid for</dt>
        <dd>
          <time dateTime={new Date(at).toISOString()}>{layerTime(at)}</time>
        </dd>
      </div>
    </dl>
  );
}
