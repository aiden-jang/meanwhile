export function StoryRecovery({
  archive,
  retry,
  holding = false,
}: {
  archive?: { label: string; open: () => void; message?: string } | undefined;
  retry: () => void;
  holding?: boolean;
}) {
  return (
    <div className="observation-note" role="status">
      <p>
        {archive?.message ?? "The selected data could not load."}
        {holding && " Showing the previous observations."}
      </p>
      <div className="observatory-actions observation-chapters">
        <button type="button" onClick={retry}>
          Try again
        </button>
        {archive && (
          <button type="button" onClick={archive.open}>
            {archive.label}
          </button>
        )}
      </div>
    </div>
  );
}

export function storyRecoveryArchive(id: string, choice: string, select: (choice: string) => void) {
  if (id === "reef" && choice === "Recent observations")
    return {
      label: "Open 2023 archive",
      open: () => select("2023 archive"),
      message: "Recent reef data unavailable.",
    };
  if (id === "atmospheric-river" && choice === "Latest forecast")
    return {
      label: "Open 9 November 2026 forecast",
      open: () => select("9 November 2026 archive"),
      message: "The latest forecast is unavailable.",
    };
  return undefined;
}
export function StoryImageRecovery({ assets }: { assets: { status: string; retry: () => void }[] }) {
  const failed = assets.find(({ status }) => status === "failed");
  if (!failed) return null;
  const retry = failed.retry;
  return (
    <p role="status" className="observation-note">
      This satellite image could not load. The last available view stays visible.{" "}
      <button type="button" onClick={retry}>
        Retry image
      </button>
    </p>
  );
}
