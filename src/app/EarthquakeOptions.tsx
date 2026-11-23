import type { Dispatch, SetStateAction } from "react";
import type { RampName } from "../globe/ramp";

export function EarthquakeOptions({
  ramp,
  setRamp,
  sound,
  setSound,
}: {
  ramp: RampName;
  setRamp: Dispatch<SetStateAction<RampName>>;
  sound: boolean;
  setSound: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <details className="layer-sources earthquake-options">
      <summary>Display & alerts</summary>
      <button
        type="button"
        aria-pressed={ramp === "cividis"}
        onClick={() => setRamp((value) => (value === "thermal" ? "cividis" : "thermal"))}
      >
        Magnitude colors · {ramp === "cividis" ? "Cividis" : "Thermal"}
      </button>
      <button type="button" aria-pressed={sound} onClick={() => setSound((value) => !value)}>
        Earthquake alerts {sound ? "on" : "off"}
      </button>
      <p>Sound for newly reported earthquakes above your selected threshold.</p>
    </details>
  );
}
