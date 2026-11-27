import { useStoryNavigation } from "../journeys/StoryNavigation";
import { StoryOnward } from "./StoryOnward";

export function StoryLocation() {
  const navigation = useStoryNavigation();
  const place = navigation?.worldContinuation();
  if (!place || !navigation) return null;
  const label = place.title ?? `Explore ${place.point.name}`;
  return (
    <StoryOnward
      id="explore-story-location"
      label={label}
      onClick={(event) => {
        const latest = navigation.worldContinuation();
        if (latest) navigation.continueAt(latest, event.currentTarget);
      }}
    />
  );
}
