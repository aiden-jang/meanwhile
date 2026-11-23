import { aimAt, type TonightView } from "../../geo/tonight";
import type { CameraState } from "../../globe/controlsTypes";
import { lazy, Suspense } from "react";
import type { LunarDeparture, TonightPresentation } from "../../globe/scenePresentation";
import { ExperienceEnding } from "../journeys/ExperienceEnding";
import { moonfallShare } from "../moonfall/moonfallShare";
import { ShareMoment } from "../observations/StorySession";
import { skyPosition, skyStoryMoment, type SkyPosition } from "./skyMoment";

const Moonfall = lazy(() => import("../moonfall/Moonfall").then(({ Moonfall }) => ({ default: Moonfall })));

export function TonightMoonfall({
  aim,
  resume,
  view,
  onView,
  label,
  onReturn,
  earthView,
}: {
  aim: TonightPresentation;
  resume: SkyPosition["lunar"];
  view: TonightPresentation | null;
  onView: (view: TonightPresentation) => void;
  label: string;
  onReturn: () => void;
  earthView: string | undefined;
}) {
  return (
    <>
      <div className="tonight-heading" data-moonfall-panel="">
        <h2 id="local-sky-title">Moonfall</h2>
        <div className="observatory-actions tonight-back">
          <button type="button" id="moonfall-back" onClick={onReturn}>
            {label}
          </button>
        </div>
      </div>
      {earthView && (
        <p className="night-earth-view">
          <span>Your Earth view</span> {earthView}
        </p>
      )}
      <Suspense fallback={<p role="status">Loading the lunar survey…</p>}>
        <Moonfall sky={aim} onView={onView} resume={resume} />
      </Suspense>
      {view?.moonfall && (
        <ShareMoment
          current={() => skyStoryMoment("moonfall", skyPosition(view, false, false))}
          share={moonfallShare}
        />
      )}
      <ExperienceEnding id="moonfall" />
    </>
  );
}

export function lunarFlight(view: TonightView, camera?: CameraState) {
  const moon = view.bodies[0]!;
  const origin: LunarDeparture = {
    previous: view,
    camera,
    scroll: document.getElementById("observatory-intro")?.scrollTop ?? 0,
  };
  const aim = moon.altitude > 0 ? { ...view, look: aimAt(moon), targetName: moon.name } : view;
  return { ...origin, aim: { ...aim, nightTrail: undefined, lunarDeparture: origin } };
}
