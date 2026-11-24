import type { ReactNode, RefObject } from "react";
import "./detail-panel.css";

export function DetailPanelHeading({
  id,
  title,
  backLabel,
  backRef,
  onBack,
  children,
}: {
  id: string;
  title: string;
  backLabel: string;
  backRef?: RefObject<HTMLButtonElement>;
  onBack: () => void;
  children?: ReactNode;
}) {
  return (
    <header className="detail-panel-heading">
      <h2 id={id} tabIndex={-1}>
        {title}
      </h2>
      <button type="button" ref={backRef} className="reading-back" aria-label={backLabel} onClick={onBack}>
        Back
      </button>
      {children}
    </header>
  );
}
