export function DustSliceControls({
  open,
  image,
  failed,
  retry,
  toggle,
}: {
  open: boolean;
  image: string | undefined;
  failed: boolean;
  retry: () => void;
  toggle: () => void;
}) {
  return (
    <>
      <div className="observatory-actions">
        <button type="button" aria-pressed={open} onClick={toggle}>
          {open ? "Close lidar slice" : "Open lidar slice"}
        </button>
      </div>
      {open && (
        <>
          <div className="story-section-caption">
            <strong>CALIPSO · 23 June 2020, 06:49 UTC</strong>
            <span>0–15 km · height exaggerated 80×</span>
            <span>Warm colors: stronger laser backscatter. Clouds also scatter light.</span>
            {failed && (
              <button type="button" onClick={retry}>
                Retry lidar image
              </button>
            )}
            {!failed && !image && <span role="status">Loading the lidar profile…</span>}
          </div>
          {image && (
            <details className="lidar-profile">
              <summary>Read the lidar profile</summary>
              <img
                src={image}
                alt="CALIPSO laser backscatter from the surface to 15 km along the Caribbean track"
              />
            </details>
          )}
        </>
      )}
    </>
  );
}
