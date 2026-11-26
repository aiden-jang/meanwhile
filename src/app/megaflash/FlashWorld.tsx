import { flashAnchors, markedDetection, seconds, windowAtStep } from "./flashReadings";

export function FlashWorld({
  status,
  step,
  optical,
  reading,
  onSelect,
}: {
  status: string;
  step: number;
  optical: boolean;
  reading: boolean;
  onSelect: (step: number) => void;
}) {
  const detection = step >= 0 ? markedDetection(step) : undefined;
  const selected = flashAnchors.some((anchor) => anchor.step === step);
  return (
    <div className="flash-world">
      <span className="flash-world-status" data-world-inset="">
        {status}
      </span>
      {optical && (
        <>
          {!reading &&
            flashAnchors.map(({ step: index, place, detection: [, lon, lat] }) => (
              <button
                key={index}
                type="button"
                className="flash-pulse"
                aria-label={`${place}, ${seconds(windowAtStep(index).start)} s`}
                aria-pressed={index === step}
                data-observation-anchor=""
                data-compact-anchor=""
                data-flash-pulse=""
                data-anchor-radius="1.014"
                data-lon={lon}
                data-lat={lat}
                onClick={() => onSelect(index)}
              >
                <i aria-hidden="true" />
                <span aria-hidden="true">{place}</span>
                {index === step && <small aria-hidden="true">{seconds(windowAtStep(step).start)} s</small>}
              </button>
            ))}
          {detection && (reading || !selected) && (
            <span
              className="flash-pulse flash-pulse-reading"
              aria-hidden="true"
              data-observation-anchor=""
              data-compact-anchor=""
              data-anchor-radius="1.014"
              data-lon={detection[1]}
              data-lat={detection[2]}
            >
              <i />
              <small>{seconds(windowAtStep(step).start)} s</small>
            </span>
          )}
          <div className="flash-scene-key" data-world-inset="" aria-hidden="true">
            <i />
            Selected window
            <i />
            Full footprint
          </div>
        </>
      )}
    </div>
  );
}
