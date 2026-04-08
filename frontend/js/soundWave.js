/**
 * Эквалайзер / звуковая волна на canvas (главная страница).
 * Радужные столбцы + полупрозрачные синусоиды, анимация по времени.
 */

/**
 * @param {HTMLElement} container
 */
export function mountSoundWave(container) {
  const wrap = document.createElement("div");
  wrap.className = "sound-wave";
  wrap.setAttribute("aria-hidden", "true");

  const canvas = document.createElement("canvas");
  canvas.className = "sound-wave__canvas";
  wrap.appendChild(canvas);
  container.appendChild(wrap);

  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};

  let raf = 0;
  let t = 0;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = wrap.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = 200;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }

  let { w, h } = resize();
  const ro = new ResizeObserver(() => {
    ({ w, h } = resize());
    if (reduceMotion) {
      t = 0.5;
      frame();
    }
  });
  ro.observe(wrap);

  const numBars = 88;

  function hueAt(x) {
    if (w <= 0) return 160;
    const p = x / w;
    return 115 + p * 235;
  }

  function barHeight(i, time) {
    const nx = i / numBars;
    const a =
      Math.sin(time * 1.1 + nx * 8) * 0.35 +
      Math.sin(time * 0.7 + nx * 14) * 0.25 +
      Math.sin(time * 2.2 + i * 0.35) * 0.2;
    const base = 0.35 + 0.45 * (0.55 + 0.45 * Math.sin(nx * Math.PI));
    return Math.max(0.12, Math.min(1, base + a * 0.55));
  }

  function frame() {
    if (!canvas.isConnected) {
      cancelAnimationFrame(raf);
      ro.disconnect();
      return;
    }

    if (w < 16) {
      if (!reduceMotion) {
        raf = requestAnimationFrame(frame);
      }
      return;
    }

    if (!reduceMotion) {
      t += 0.016;
    }
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);

    const cy = h * 0.5;
    const maxHalf = h * 0.42;
    const colW = w / numBars;

    for (let i = 0; i < numBars; i++) {
      const barW = Math.max(1.2, colW * 0.68);
      const x = i * colW + (colW - barW) * 0.5;
      const hh = hueAt(x + barW * 0.5);
      const amp = barHeight(i, t);
      const half = maxHalf * amp;

      const g = ctx.createLinearGradient(x, cy - half, x, cy + half);
      g.addColorStop(0, `hsla(${hh}, 88%, 52%, 0.95)`);
      g.addColorStop(0.38, `hsla(${hh + 15}, 95%, 62%, 0.85)`);
      g.addColorStop(0.48, "rgba(255,255,255,0.95)");
      g.addColorStop(0.52, "rgba(255,255,255,0.98)");
      g.addColorStop(0.62, `hsla(${hh - 8}, 90%, 58%, 0.88)`);
      g.addColorStop(1, `hsla(${hh}, 85%, 48%, 0.75)`);

      ctx.fillStyle = g;
      ctx.shadowColor = `hsla(${hh}, 100%, 60%, 0.55)`;
      ctx.shadowBlur = 14;
      ctx.fillRect(x, cy - half, barW, half * 2);
      ctx.shadowBlur = 0;
    }

    ctx.globalCompositeOperation = "lighter";
    for (let line = 0; line < 4; line++) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255,255,255,${0.12 + line * 0.06})`;
      ctx.lineWidth = 1.1;
      const phase = t * (0.9 + line * 0.15) + line * 1.7;
      const amp = 10 + line * 3;
      for (let x = 0; x <= w; x += 2) {
        const y = cy + Math.sin(x * 0.018 + phase) * amp + Math.sin(x * 0.009 + phase * 0.5) * (4 + line);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";

    if (!reduceMotion) {
      raf = requestAnimationFrame(frame);
    }
  }

  if (reduceMotion) {
    resize();
    t = 0.5;
    frame();
  } else {
    raf = requestAnimationFrame(frame);
  }

  return function cleanup() {
    cancelAnimationFrame(raf);
    ro.disconnect();
    if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
  };
}
