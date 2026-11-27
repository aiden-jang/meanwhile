import type { MouseEventHandler } from "react";

export function StoryOnward({
  id,
  label,
  onClick,
  disabled,
}: {
  id: string;
  label: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
}) {
  return (
    <button className="story-onward" type="button" id={id} onClick={onClick} disabled={disabled}>
      <span>{label}</span>
      <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
        <path d="M4 10h11m-4-4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </button>
  );
}
