import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import type { SkyCity } from "../../geo/tonight";
import { DetailPanelHeading } from "../DetailPanelHeading";

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
  detail,
}: {
  title: string;
  label: string;
  back: RefObject<HTMLButtonElement>;
  onBack: () => void;
  detail?: boolean;
}) {
  if (detail)
    return (
      <DetailPanelHeading
        id="local-sky-title"
        title={title}
        backLabel={label}
        backRef={back}
        onBack={onBack}
      />
    );
  return (
    <div className="tonight-heading">
      <h2 id="local-sky-title">{title}</h2>
      <div className="observatory-actions tonight-back">
        <button className="reading-back" type="button" ref={back} onClick={onBack}>
          {label}
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
  timeline,
  moonfall,
  onBack,
  onWeather,
}: {
  city: SkyCity;
  timeline: ReactNode;
  moonfall: ReactNode;
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
      <div className="sky-held-reading">{timeline}</div>
      {moonfall}
    </>
  );
}
