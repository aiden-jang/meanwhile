import { lunarTraverses } from "../../sources/moonfall/traverses";
import { useStoryNavigation } from "../journeys/StoryNavigation";
import { savedVisitKey, type Visit } from "./library";
import "./visitor.css";
import { layerTime, storyObservationTime } from "../layerTime";
import { discharge, riverGauge } from "../observations/riverGauges";

export function visitNote(visit: Visit) {
  const river = visit.position.river;
  if (river) return `${riverGauge(river.gauge)?.label} · ${discharge(river.value)} · ${layerTime(river.at)}`;
  if (visit.observation) {
    const { at, depth, temperature, salinity } = visit.observation;
    return `${layerTime(at)} · ${Math.round(depth).toLocaleString()} m · ${temperature.toFixed(2)} °C · ${salinity.toFixed(3)} salinity`;
  }
  const solar = visit.position.solar;
  if (solar) return `${solar.value} km/s · ${solar.source} · ${layerTime(solar.at)}`;
  const lunar = visit.position.sky?.lunar;
  if (lunar)
    return `${lunarTraverses[lunar.eva]?.stations[lunar.station ?? -1] ?? `Traverse ${lunar.eva + 1}`} · Apollo 17, 1972`;
  if (visit.position.sky) return `${visit.position.sky.city} · saved sky`;
  const moment = visit.position.moment;
  if (visit.id === "rupture" && moment?.chapter === "waves" && moment.at !== undefined)
    return `Recorded waves · ${new Date(moment.at).toISOString().slice(11, 19)} UTC`;
  if (visit.id === "megaflash" && moment?.chapter === "inspect" && moment.at !== undefined)
    return `Optical detections · ${((moment.at - Date.parse("2017-10-22T08:56:45.834Z")) / 1000).toFixed(2)} s`;
  if (visit.id === "kilauea" && moment?.chapter === "compare")
    return `Kapoho Bay · Shoreline divider at ${moment.choice ?? "50"}%`;
  const at = moment?.at ?? visit.position.radar?.at;
  if (at !== undefined) return storyObservationTime(visit.id, at);
  if (visit.position.float) return "Saved float profile and depth";
  return "Opens the latest available view";
}
export function SaveVisit() {
  const navigation = useStoryNavigation();
  if (!navigation?.active || ["float", "tonga", "sun"].includes(navigation.active)) return null;
  const lunar = navigation.active === "moonfall" ? navigation.current()?.position.sky?.lunar : undefined;
  if (lunar && lunar.station !== null) return null;
  return (
    <div className="visit-save">
      <button
        type="button"
        onClick={() => {
          const visit = navigation.current();
          const previous =
            visit && navigation.library.saved.find((entry) => savedVisitKey(entry) === savedVisitKey(visit));
          if (!visit) return;
          if (visit.id === "river" && visit.position.moment) {
            const { at: _, ...basin } = visit.position.moment;
            void _;
            navigation.library.save({
              ...visit,
              position: { moment: basin },
              ...(previous?.note ? { note: previous.note } : {}),
            });
          } else {
            navigation.library.save({ ...visit, ...(previous?.note ? { note: previous.note } : {}) });
          }
        }}
      >
        {navigation.library.saved.some((entry) => savedVisitKey(entry) === navigation.active)
          ? navigation.active === "river"
            ? "Update river bookmark"
            : navigation.active === "aurora"
              ? "Update forecast bookmark"
              : "Update saved view"
          : navigation.active === "river"
            ? "Bookmark river"
            : navigation.active === "aurora"
              ? "Bookmark forecast"
              : "Save view"}
      </button>
      <span role="status" aria-label="Saved view status">
        {navigation.library.notice}
      </span>
    </div>
  );
}
