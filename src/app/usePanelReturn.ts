import { useEffect, useState } from "react";
import { restorePanel, type PanelReturn } from "./panelReturn";

export function usePanelReturn() {
  const [restoration] = useState(() => {
    let frame = 0;
    const cancel = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    return {
      cancel,
      restore(saved: PanelReturn) {
        cancel();
        frame = requestAnimationFrame(() => {
          const align = restorePanel(saved);
          // WebKit can commit the rail's scroll after the first frame following history navigation.
          frame = align ? requestAnimationFrame(align) : 0;
        });
      },
    };
  });
  useEffect(() => restoration.cancel, [restoration]);
  return restoration;
}
