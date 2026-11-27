import { DustProfile, type LidarCursor } from "./DustProfile";

export function DustSliceControls({
  image,
  folded,
  unfold,
  failed,
  retry,
  cursor,
  select,
}: {
  image: string | undefined;
  folded: boolean;
  unfold: () => void;
  failed: boolean;
  retry: () => void;
  cursor: LidarCursor | null;
  select: (cursor: LidarCursor | null) => void;
}) {
  return (
    <>
      <div className="story-section-caption">
        <strong>CALIPSO · 23 June 2020, 06:49 UTC</strong>
        <span>0–15 km · height exaggerated 80× · tilted for viewing</span>
        <span>Warm colors: stronger laser backscatter. Clouds also scatter light.</span>
        {failed && (
          <button type="button" onClick={retry}>
            Retry lidar image
          </button>
        )}
        {!failed && !image && <span role="status">Loading the lidar profile…</span>}
      </div>
      {image && <DustProfile folded={folded} unfold={unfold} image={image} cursor={cursor} select={select} />}
    </>
  );
}
