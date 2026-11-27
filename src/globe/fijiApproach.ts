import { depthRecords } from "../data/depthRecords";
import type { CameraState } from "./controlsTypes";

const [august, september] = depthRecords;
export const FIJI_CENTRE = {
  lon: (august.lon + september.lon - 360) / 2,
  lat: (august.lat + september.lat) / 2,
};

export function fijiApproach(map: boolean): CameraState {
  return { ...FIJI_CENTRE, zoom: map ? 3.6 : 2.35 };
}
