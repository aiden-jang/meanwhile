import { Suspense, type ReactNode } from "react";
import type { ObservatoryProps } from "../observatoryProps";
import { TonightSky } from "../ObservatoryViews";
import { StoryLoading } from "../StoryLoading";

export function ObservatorySky({
  views: { tonight, observations, skyCity },
  explorer,
  explorePaths,
  tabs,
  returnLabel = "Back to After Dark",
  onClose,
  closeFromBrowse,
}: Pick<ObservatoryProps, "views" | "explorer" | "explorePaths"> & {
  tabs?: ReactNode;
  returnLabel?: string | undefined;
  onClose?: (() => void) | undefined;
  closeFromBrowse: (fallback: () => void) => () => void;
}) {
  const returnToStory = closeFromBrowse(() => {
    const id =
      tonight.entry.mode === "meteors"
        ? "open-meteor-nights"
        : tonight.entry.mode === "moonfall"
          ? "open-featured-moonfall"
          : "open-tonight-sky";
    observations.returnTo(id, tonight.close);
  });
  return (
    <Suspense fallback={<StoryLoading>Opening Tonight’s Sky…</StoryLoading>}>
      <TonightSky
        key={tonight.entry.revision}
        view={tonight.view}
        onView={tonight.update}
        onJourney={tonight.handoff}
        onLocalSky={() => {
          tonight.setOrbit(false);
          observations.setMap(false);
        }}
        camera={explorer}
        preference={skyCity}
        projection={observations}
        initialMode={tonight.entry.mode}
        returnSky={tonight.entry.returnSky}
        initialPosition={tonight.entry.position}
        nightfall={tonight.entry.nightfall}
        orbit={tonight.orbit}
        onCityWeather={explorePaths.cityWeather}
        returnLabel={returnLabel}
        onClose={onClose ?? returnToStory}
        tabs={tabs}
      />
    </Suspense>
  );
}
