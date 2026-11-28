import { hawaiiPlaces } from "./hawaiiPlaces";
import { useStoryNavigation } from "../journeys/StoryNavigation";
import { pacificMoment } from "../pacific/pacificMoment";
import type { StoryMoment } from "../observations/storyMoment";
import "./hawaii-markers.css";

export function HawaiiMarkers({ map }: { map: boolean }) {
  const navigation = useStoryNavigation();
  if (!navigation) return null;
  return (
    <div className="hawaii-markers" role="group" aria-label="Readings around Hawaiʻi">
      {hawaiiPlaces.map(({ id, trigger, title, reading }) => {
        const prepare = () =>
          void (
            id === "pacific"
              ? import("../pacific/PacificDescent")
              : import("../kilauea/loadKilauea").then((m) => m.loadKilauea())
          ).catch(() => {});
        return (
          <div className="island-anchor" data-island-place={id} key={id} hidden>
            <i className="island-pin" aria-hidden="true" />
            <svg aria-hidden="true" className="island-leader">
              <path />
            </svg>
            <button
              id={trigger}
              type="button"
              className="island-note"
              onFocus={prepare}
              onPointerEnter={prepare}
              aria-label={title + " · " + reading}
              onClick={(event) => {
                event.currentTarget.focus({ preventScroll: true });
                const moment: StoryMoment =
                  id === "pacific"
                    ? pacificMoment({ position: 0, profile: false }, map)
                    : { id, map, at: Date.parse("2018-05-28T07:00-10:00"), chapter: "lava:0" };
                navigation.resume({ id, seen: Date.now(), position: { moment } }, trigger);
              }}
            >
              <strong>
                {title}
                <span className="island-arrow" aria-hidden="true">
                  ↗
                </span>
              </strong>
              <small>{reading}</small>
            </button>
          </div>
        );
      })}
    </div>
  );
}
