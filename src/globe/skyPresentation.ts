import type { TonightView } from "../geo/tonight";
import type { CameraState } from "./controlsTypes";
import type { MoonfallView } from "./moonfall/scene";

export type LunarDeparture = {
  previous: TonightView;
  map: boolean;
  camera?: CameraState | undefined;
  scroll: number;
};
export type TonightPresentation = TonightView & {
  moonfall?: MoonfallView;
  lunarDeparture?: LunarDeparture;
  reference?: CameraState;
  earthReference?: true;
};

export function hasMoonNight(
  view: TonightPresentation | null,
): view is TonightPresentation & { nightStart: number } {
  return (
    view?.nightStart !== undefined &&
    !view.radiantTrail &&
    view.sunCover === undefined &&
    !view.lunarDeparture &&
    !view.earthReference
  );
}
