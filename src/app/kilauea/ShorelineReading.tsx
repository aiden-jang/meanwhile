import { useLayoutEffect, useRef } from "react";
import { coastHandle, coastlineDivider } from "./surveyMap";

export function ShorelineReading({
  split,
  guided,
  onAdjust,
}: {
  split: number;
  guided: boolean;
  onAdjust: (split: number) => void;
}) {
  const reading = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (!guided)
      reading.current?.closest<HTMLElement>("#observatory-intro")?.scrollTo({ top: 0, behavior: "instant" });
  }, [guided]);
  const after = coastHandle.reference >= coastlineDivider(split);
  return (
    <section ref={reading} className="kapoho-reading" aria-label="Kapoho Bay at the marked point">
      <header>
        <h4>Kapoho Bay</h4>
        <span className="kapoho-former-shore">Former shoreline</span>
      </header>
      <div className="kapoho-surveys">
        <button type="button" aria-pressed={!after} onClick={() => onAdjust(0)}>
          <small>Before eruption</small>
          <strong>Open water</strong>
        </button>
        <button type="button" aria-pressed={after} onClick={() => onAdjust(100)}>
          <small>Aug 9, 2018</small>
          <strong>New lava land</strong>
        </button>
      </div>
    </section>
  );
}
