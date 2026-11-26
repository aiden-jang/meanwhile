import type { ReactNode } from "react";
import "./reading-label.css";

export function ReadingLabel({
  reading,
  shortDock = false,
  children,
}: {
  reading: string;
  shortDock?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className="reading-label"
      data-reading-label={reading}
      data-short-dock={shortDock || undefined}
      aria-hidden="true"
    >
      <i className="reading-label-halo" />
      <span>{children}</span>
    </span>
  );
}
