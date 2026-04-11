import { useEffect } from "react";

/**
 * Drives CSS variables for the concert wash (cursor follow + click “beat”).
 * Keeps pointer-events on the document; does not render DOM.
 */
export function InteractiveBackdrop() {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--cursor-x", "50");
    root.style.setProperty("--cursor-y", "38");

    let raf = 0;
    let targetX = 50;
    let targetY = 38;
    let curX = 50;
    let curY = 38;

    const tick = () => {
      curX += (targetX - curX) * 0.12;
      curY += (targetY - curY) * 0.12;
      root.style.setProperty("--cursor-x", curX.toFixed(2));
      root.style.setProperty("--cursor-y", curY.toFixed(2));
      if (Math.abs(targetX - curX) > 0.04 || Math.abs(targetY - curY) > 0.04) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    };

    const queueFrame = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onMove = (e: MouseEvent) => {
      const w = Math.max(window.innerWidth, 1);
      const h = Math.max(window.innerHeight, 1);
      targetX = (e.clientX / w) * 100;
      targetY = (e.clientY / h) * 100;
      queueFrame();
    };

    const onClick = () => {
      root.setAttribute("data-bg-beat", "1");
      window.setTimeout(() => root.removeAttribute("data-bg-beat"), 480);
    };

    const onLeave = () => {
      targetX = 50;
      targetY = 36;
      queueFrame();
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("click", onClick, { passive: true });
    document.body.addEventListener("mouseleave", onLeave);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick);
      document.body.removeEventListener("mouseleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
      root.removeAttribute("data-bg-beat");
    };
  }, []);

  return null;
}
