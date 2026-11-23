import { useLayoutEffect, useRef, type RefObject } from "react";
import type { SkyCity } from "../../geo/tonight";

export function skyTimeFormats(timeZone: string) {
  return {
    clock: new Intl.DateTimeFormat("en", { timeZone, hour: "numeric", minute: "2-digit" }),
    local: new Intl.DateTimeFormat("en", {
      timeZone,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }),
  };
}

export function SkyHeading({
  title,
  label,
  back,
  onBack,
  compact,
}: {
  title: string;
  label: string;
  back: RefObject<HTMLButtonElement>;
  onBack: () => void;
  compact?: boolean;
}) {
  return (
    <div className="tonight-heading">
      <h2 id="local-sky-title">{title}</h2>
      <div className="observatory-actions tonight-back">
        <button
          className="reading-back"
          type="button"
          ref={back}
          onClick={onBack}
          aria-label={compact ? label : undefined}
        >
          {compact ? "Back" : label}
        </button>
      </div>
    </div>
  );
}

export function SkyEarthEntry({ city, open }: { city: SkyCity; open: () => void }) {
  return (
    <button type="button" id="see-observing-city" className="sky-earth-entry" onClick={open}>
      See {city.name} on Earth
    </button>
  );
}

export function SkyEarthReading({
  city,
  at,
  time,
  onBack,
  onWeather,
}: {
  city: SkyCity;
  at: number;
  time: string;
  onBack: () => void;
  onWeather: () => void;
}) {
  const back = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => back.current?.focus({ preventScroll: true }), []);
  return (
    <>
      <SkyHeading title={`${city.name} on Earth`} label="Back to local sky" back={back} onBack={onBack} />
      <button className="sky-earth-entry" type="button" onClick={onWeather}>
        Explore live layers here
      </button>
      <div className="sky-held-reading">
        <span>Local sky held at</span>
        <time dateTime={new Date(at).toISOString()}>{time}</time>
      </div>
    </>
  );
}
