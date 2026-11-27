import type { TongaStation } from "./useTongaPlayback";
import { pressureSubject } from "../continuity/worldContinuation";
import { useStoryNavigation } from "../journeys/StoryNavigation";
import { StoryOnward } from "../continuity/StoryOnward";

export function ExploreStation({ station, minute }: { station: TongaStation; minute: number }) {
  const navigation = useStoryNavigation();
  if (!navigation) return null;
  return (
    <StoryOnward
      id="explore-pressure-station"
      label={`Explore ${station.name}`}
      onClick={(event) => navigation.continueAt(pressureSubject(station, minute), event.currentTarget)}
    />
  );
}
