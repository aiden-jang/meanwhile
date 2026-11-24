import type { ReactNode } from "react";
import "./reading-label.css";

export function ReadingLabel({ reading, children }: { reading: string; children: ReactNode }) {
  return (
    <span className="reading-label" data-reading-label={reading} aria-hidden="true">
      <i className="reading-label-halo" />
      <span>{children}</span>
    </span>
  );
}
