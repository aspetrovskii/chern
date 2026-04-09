import { useEffect, useRef, useState } from "react";
import { t, type Locale } from "../../lib/i18n";
import npStyles from "./NowPlaying.module.css";

const PLAYER_COLLAPSE_KEY = "conce-home-player-collapsed";

const BAR_COUNT = 7;

type NowPlayingProps = {
  locale: Locale;
  onCollapsedChange: (collapsed: boolean) => void;
};

function useEqAnimation(playing: boolean) {
  const eqBarsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const rafRef = useRef(0);
  const smoothedRef = useRef<number[]>(Array.from({ length: BAR_COUNT }, () => 0.18));
  const timeRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const reduceMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const phase = useRef<number[]>(
    Array.from({ length: BAR_COUNT }, (_, i) => (i / BAR_COUNT) * Math.PI * 2 + 0.4 * Math.sin(i * 1.7))
  ).current;
  const rate = useRef<number[]>(
    Array.from({ length: BAR_COUNT }, (_, i) => 1.05 + 0.35 * Math.sin(i * 2.1))
  ).current;

  useEffect(() => {
    if (!playing || reduceMotion) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      lastTsRef.current = null;
      eqBarsRef.current.forEach((el) => {
        if (!el) return;
        if (reduceMotion) {
          el.style.transform = "scaleY(0.42)";
          el.style.opacity = "0.82";
        } else {
          el.style.transform = "scaleY(0.1)";
          el.style.opacity = "0.38";
        }
      });
      return;
    }

    const tick = (ts: number) => {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = Math.min(0.05, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;
      timeRef.current += dt;

      const t = timeRef.current;
      const globalPulse = 0.5 + 0.5 * Math.sin(t * 2.4);
      const swell = 0.5 + 0.5 * Math.sin(t * 0.85);

      for (let i = 0; i < BAR_COUNT; i++) {
        const el = eqBarsRef.current[i];
        if (!el) continue;

        const ph = phase[i];
        const rt = rate[i];
        const waveA = 0.5 + 0.5 * Math.sin(t * rt * 4.2 + ph);
        const waveB = 0.5 + 0.5 * Math.sin(t * (rt * 2.1 + 0.6) + ph * 1.3 + 1.1);
        const neighbor = 0.12 * Math.sin(t * 3.1 + i * 0.9);
        let target =
          0.14 +
          0.62 * waveA * (0.55 + 0.45 * swell) +
          0.18 * waveB * globalPulse +
          neighbor;
        target = Math.min(0.98, Math.max(0.12, target));

        const prev = smoothedRef.current[i];
        const alpha = 1 - Math.exp(-dt * 11);
        const v = prev + (target - prev) * alpha;
        smoothedRef.current[i] = v;

        el.style.transform = `scaleY(${v})`;
        el.style.opacity = String(0.38 + v * 0.55);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    smoothedRef.current = Array.from({ length: BAR_COUNT }, () => 0.18);
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      lastTsRef.current = null;
    };
  }, [playing, reduceMotion]);

  return eqBarsRef;
}

export function NowPlaying({ locale, onCollapsedChange }: NowPlayingProps) {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(PLAYER_COLLAPSE_KEY) === "1"
  );
  const [playing, setPlaying] = useState(false);
  const eqBarsRef = useEqAnimation(playing);

  const applyCollapsed = (next: boolean) => {
    setCollapsed(next);
    localStorage.setItem(PLAYER_COLLAPSE_KEY, next ? "1" : "0");
    onCollapsedChange(next);
  };

  return (
    <div
      className={`${npStyles["now-playing"]}${collapsed ? ` ${npStyles["now-playing--collapsed"]}` : ""}`}
    >
      <button
        type="button"
        className={npStyles["now-playing__toggle"]}
        aria-expanded={!collapsed}
        aria-label={t(locale, "home_player_toggle_aria")}
        onClick={() => applyCollapsed(!collapsed)}
      >
        <span className={npStyles["now-playing__chev"]} aria-hidden="true">
          {collapsed ? "▲" : "▼"}
        </span>
      </button>
      <div className={npStyles["now-playing__bar"]}>
        <img
          className={npStyles["now-playing__cover"]}
          src={`${import.meta.env.BASE_URL}player-cover.svg`}
          alt=""
          width={112}
          height={112}
          decoding="async"
        />
        <div className={npStyles["now-playing__meta"]}>
          <span className={npStyles["now-playing__label"]}>{t(locale, "home_player_label")}</span>
          <span className={npStyles["now-playing__track"]}>{t(locale, "home_player_track")}</span>
        </div>
        <div
          className={`${npStyles["now-playing__eq"]}${playing ? "" : ` ${npStyles["now-playing__eq--paused"]}`}`}
          aria-hidden="true"
        >
          {Array.from({ length: BAR_COUNT }, (_, i) => (
            <span
              key={i}
              ref={(el) => {
                eqBarsRef.current[i] = el;
              }}
              className={npStyles["now-playing__eq-bar"]}
            />
          ))}
        </div>
        <div className={npStyles["now-playing__controls"]}>
          <button
            type="button"
            className={npStyles["now-playing__btn"]}
            aria-label={t(locale, "home_player_prev_aria")}
          >
            ⏮
          </button>
          <button
            type="button"
            className={`${npStyles["now-playing__btn"]} ${npStyles["now-playing__btn--play"]}`}
            aria-label={
              playing ? t(locale, "home_player_pause_aria") : t(locale, "home_player_play_aria")
            }
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? (
              <svg
                className={npStyles["now-playing__btn-icon"]}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M8 6.5h3.5v11H8v-11zm4.5 0H16v11h-3.5v-11z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg
                className={npStyles["now-playing__btn-icon"]}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M9 6.5v11l9.5-5.5L9 6.5z" fill="currentColor" />
              </svg>
            )}
          </button>
          <button
            type="button"
            className={npStyles["now-playing__btn"]}
            aria-label={t(locale, "home_player_next_aria")}
          >
            ⏭
          </button>
        </div>
      </div>
    </div>
  );
}
