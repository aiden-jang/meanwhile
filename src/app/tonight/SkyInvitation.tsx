import { skyDirection } from "./skyTargets";
import type { TonightView } from "../../geo/tonight";

export function SkyInvitation({
  arrivalCity,
  city,
  at,
  time,
  target,
  onFind,
  onChange,
}: {
  arrivalCity: boolean;
  city: string;
  at: number;
  time: string;
  target: TonightView["bodies"][number] | undefined;
  onFind: () => void;
  onChange: () => void;
}) {
  return (
    <section className="tonight-invitation" aria-label="Start observing">
      <h3>
        {arrivalCity
          ? `Nightfall in ${city}`
          : target
            ? `Look ${skyDirection(target.azimuth)}.`
            : "Move through the night."}
      </h3>
      <p>
        {arrivalCity
          ? "Begin at calculated local sunset. Move through the night or follow the Moon to Apollo 17."
          : target
            ? `${target.name === "Moon" ? "The Moon" : target.name} is above ${city}’s horizon. Start there, then move through the night.`
            : `The Moon and planets are below ${city}’s horizon at this time. Try another moment in the night.`}
      </p>
      <p className="tonight-invitation-context">
        {city} · <time dateTime={new Date(at).toISOString()}>{time}</time>
        {!arrivalCity && " · Calculated sky"}
        {target && (
          <span>
            {arrivalCity && `${target.name} · `}
            {Math.round(target.altitude)}° above horizon · {Math.round(target.azimuth) % 360}° bearing
          </span>
        )}
      </p>
      <div className="observatory-actions">
        {target && (
          <button
            type="button"
            className="tonight-find"
            onClick={() => {
              onFind();
              requestAnimationFrame(() =>
                document.querySelector<HTMLButtonElement>(".tonight-objects button")?.focus(),
              );
            }}
          >
            Find {target.name === "Moon" ? "the Moon" : target.name}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            onChange();
            requestAnimationFrame(() =>
              document.querySelector<HTMLSelectElement>(".tonight-city select")?.focus(),
            );
          }}
        >
          Change city or night
        </button>
      </div>
    </section>
  );
}
