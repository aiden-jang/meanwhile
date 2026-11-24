import { useEffect, useState } from "react";
import desktopRelief from "./relief.webp?url";
import phoneRelief from "./relief-phone.webp?url";

const decoded = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<HTMLImageElement | null>>();

export const smallLavaSurvey = () => window.matchMedia("(pointer: coarse), (max-width: 767px)").matches;

export function prepareLavaRelief(small = smallLavaSurvey()) {
  const url = small ? phoneRelief : desktopRelief;
  const cached = decoded.get(url);
  if (cached) return Promise.resolve(cached);
  const existing = pending.get(url);
  if (existing) return existing;
  const loading = new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    const timeout = window.setTimeout(() => {
      image.removeAttribute("src");
      resolve(null);
    }, 10_000);
    image.src = url;
    void image.decode().then(
      () => {
        window.clearTimeout(timeout);
        resolve(image);
      },
      () => {
        window.clearTimeout(timeout);
        resolve(null);
      },
    );
  }).then((image) => {
    pending.delete(url);
    if (image) decoded.set(url, image);
    return image;
  });
  pending.set(url, loading);
  return loading;
}

export function useLavaRelief(small: boolean) {
  const [image, setImage] = useState<HTMLImageElement | null>();
  useEffect(() => {
    let active = true;
    let frame = 0;
    void prepareLavaRelief(small).then((relief) => {
      if (!active) return;
      // Give the shared globe a painted frame before the first survey draw and upload.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => setImage(relief));
      });
    });
    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, [small]);
  return image;
}
