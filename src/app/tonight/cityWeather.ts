import type { SkyCity } from "../../geo/tonight";
import type { useObservatory } from "../useObservatory";

export type CityWeatherLayers = { radar: boolean; wind: boolean };
export type CityWeatherVisit = {
  city: SkyCity;
  at: number;
  map: boolean;
  layers: CityWeatherLayers;
  from: ReturnType<ReturnType<typeof useObservatory>["navigation"]["capture"]>;
};
