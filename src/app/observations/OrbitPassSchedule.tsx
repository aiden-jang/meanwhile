import type { ObservationData } from "./types";

export function noVisiblePass(city: string) {
  return `No visible pass found in the next 48 hours for ${city}.`;
}

export function orbitPassWindow(
  pass: NonNullable<ObservationData["visiblePass"]>,
  timeOf: (at: number) => string,
) {
  return `${timeOf(pass.appearance)} for about ${(pass.disappearance - pass.appearance) / 60_000} min.`;
}

export function OrbitPassSchedule({
  city,
  pass,
  timeOf,
  watch,
  disabled,
}: {
  city: string;
  pass: ObservationData["visiblePass"];
  timeOf: (at: number) => string;
  watch: () => void;
  disabled: boolean;
}) {
  if (!pass) return <p className="observation-note">{noVisiblePass(city)}</p>;
  return (
    <>
      <div className="observatory-actions">
        <button type="button" className="iss-watch" disabled={disabled} onClick={watch}>
          Watch the next pass
        </button>
      </div>
      <p className="observation-note">Visible from {orbitPassWindow(pass, timeOf)}</p>
    </>
  );
}
