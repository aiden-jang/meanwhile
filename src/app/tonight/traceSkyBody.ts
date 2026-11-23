import { aimAt, localNight, type TonightView } from "../../geo/tonight";
import { nightTrail } from "../../geo/nightTrail";

export function traceSkyBody(
  view: TonightView,
  body: TonightView["bodies"][number],
  night = localNight(view.city, view.nightStart ?? view.at),
): TonightView {
  const points =
    view.targetName === body.name && view.nightTrail
      ? view.nightTrail.points
      : nightTrail(view.city, body.name, night.start, night.end);
  return { ...view, look: aimAt(body), targetName: body.name, nightTrail: { points, following: true } };
}
