import { useContext, useState } from "react";
import { storyPlace } from "../discovery/places";
import { StorySession } from "./StorySession";

export function StoryDeparture() {
  const session = useContext(StorySession);
  const place = session?.departure;
  const destination = session?.destination ?? (session?.id ? storyPlace(session.id) : undefined);
  const [visible, setVisible] = useState(true);
  if (!place || !visible) return null;
  return (
    <div
      className="recorded-anchors story-departure"
      aria-hidden="true"
      onAnimationEnd={() => setVisible(false)}
    >
      {destination && (
        <span data-observation-anchor="" data-lon={destination.lon} data-lat={destination.lat}>
          To {destination.label}
        </span>
      )}
      <span data-observation-anchor="" data-lon={place.lon} data-lat={place.lat}>
        From {place.label}
      </span>
    </div>
  );
}
