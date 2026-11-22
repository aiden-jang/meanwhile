import { searchStories } from "../storyIndex";

export function StoryIdentity({ id, heading }: { id?: string | null | undefined; heading: string }) {
  const title = searchStories.find((story) => story.id === id)?.title;
  return title && title !== heading ? <span className="story-identity">{title}</span> : null;
}
