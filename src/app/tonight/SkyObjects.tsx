import { bearingLabel, type TonightView } from "../../geo/tonight";
import type { ReactNode } from "react";
import { skyTargets } from "./skyTargets";

export function SkyFocus({
  current,
  onSelect,
  onFind,
  moonfall,
}: {
  current: TonightView;
  onSelect: (name: TonightView["bodies"][number]["name"]) => void;
  onFind: (body: TonightView["bodies"][number]) => void;
  moonfall: ReactNode;
}) {
  const body = current.bodies.find(({ name }) => name === current.targetName) ?? current.bodies[0]!;
  const visible = body.altitude > 0;
  return (
    <section className="sky-focus" aria-label="Selected sky object">
      <label>
        <span className="sr-only">Sky object</span>
        <select
          value={body.name}
          onChange={(event) => {
            const selected = current.bodies.find(({ name }) => name === event.currentTarget.value);
            if (selected) onSelect(selected.name);
          }}
        >
          {current.bodies.map(({ name }) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <p>{visible ? `${Math.round(body.altitude)}° up · ${bearingLabel(body.azimuth)}` : "Below horizon"}</p>
      <button
        type="button"
        disabled={!visible}
        onClick={() => onFind(body)}
        aria-label={`Trace ${body.name} in the sky`}
      >
        Trace
      </button>
      {body.name === "Moon" && moonfall}
    </section>
  );
}

export function SkyObjects({
  current,
  sky,
  onFind,
  moonset,
}: {
  current: TonightView;
  sky: string;
  moonset?: string | undefined;
  onFind: (body: TonightView["bodies"][number]) => void;
}) {
  const { visible, below } = skyTargets(current.bodies);
  return (
    <section className="tonight-objects" aria-label="Moon and planets">
      <h3>Above the horizon</h3>
      <p className="tonight-visibility">
        {sky} · {visible.length} {visible.length === 1 ? "object" : "objects"} above the horizon
      </p>
      {visible.length > 0 ? (
        <ul aria-label="Above the horizon">
          {visible.map((body) => (
            <li key={body.name}>
              <button
                type="button"
                aria-label={`Find ${body.name}`}
                aria-pressed={current.targetName === body.name}
                onClick={() => onFind(body)}
              >
                <span>
                  <strong>{body.name}</strong>
                  <small>
                    {body.lit !== null && `${body.lit}% lit · `}
                    {Math.round(body.altitude)}° above horizon · {bearingLabel(body.azimuth)}
                    {body.name === "Moon" && moonset && ` · ${moonset}`}
                  </small>
                </span>
                <span>Find</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No Moon or planets are above the horizon at this time. Move through the night to look again.</p>
      )}
      {below.length > 0 && (
        <details className="tonight-below">
          <summary>
            {below.length} {below.length === 1 ? "object" : "objects"} below the horizon
          </summary>
          <ul aria-label="Below the horizon">
            {below.map((body) => (
              <li key={body.name}>
                <span>{body.name}</span>
                <small>Below horizon{body.name === "Moon" && moonset && ` · ${moonset}`}</small>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p>Calculated positions at a level horizon. Clouds and light pollution affect what you’ll see.</p>
    </section>
  );
}
