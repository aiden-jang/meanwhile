import { refreshAnnotations } from "../../globe/annotationInput";

export const rainCoast = { lon: -126, lat: 42, zoom: 1.88 };

export function RainbeltControls({ pause }: { pause: () => void }) {
  return (
    <div className="observatory-actions" role="group" aria-label="Rainbelt framing">
      <button
        type="button"
        onClick={() => {
          pause();
          refreshAnnotations(rainCoast);
        }}
      >
        Focus the Pacific coast
      </button>
      <button
        type="button"
        onClick={() => {
          pause();
          refreshAnnotations({ lon: -150, lat: 6, zoom: 0.9 });
        }}
      >
        See wider coverage
      </button>
    </div>
  );
}
