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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(48);
  const durationSec = 214;
  const eqBarsRef = useEqAnimation(playing);
  const startedAtRef = useRef<number | null>(null);
  const elapsedBaseRef = useRef(48);

  useEffect(() => {
    if (playing) {
      startedAtRef.current = Date.now();
    } else if (startedAtRef.current !== null) {
      const delta = (Date.now() - startedAtRef.current) / 1000;
      elapsedBaseRef.current = Math.min(durationSec, elapsedBaseRef.current + delta);
      setElapsedSec(elapsedBaseRef.current);
      startedAtRef.current = null;
    }
  }, [playing]);

  useEffect(() => {
    if (!detailsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetailsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailsOpen]);

  useEffect(() => {
    if (!playing) return;
    const tick = window.setInterval(() => {
      if (startedAtRef.current === null) return;
      const delta = (Date.now() - startedAtRef.current) / 1000;
      const nextElapsed = Math.min(durationSec, elapsedBaseRef.current + delta);
      setElapsedSec(nextElapsed);
      if (nextElapsed >= durationSec) {
        elapsedBaseRef.current = durationSec;
        startedAtRef.current = null;
        setPlaying(false);
      }
    }, 250);
    return () => window.clearInterval(tick);
  }, [playing]);

  const progress = durationSec > 0 ? elapsedSec / durationSec : 0;
  const elapsedLabel = `${Math.floor(elapsedSec / 60)}:${String(Math.floor(elapsedSec % 60)).padStart(2, "0")}`;
  const durationLabel = `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, "0")}`;

  const seekToByClientX = (clientX: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const ratio = rect.width > 0 ? Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) : 0;
    const nextElapsed = ratio * durationSec;
    elapsedBaseRef.current = nextElapsed;
    setElapsedSec(nextElapsed);
    startedAtRef.current = playing ? Date.now() : null;
  };

  const resetTrack = () => {
    elapsedBaseRef.current = 0;
    startedAtRef.current = playing ? Date.now() : null;
    setElapsedSec(0);
  };

  const applyCollapsed = (next: boolean) => {
    setCollapsed(next);
    localStorage.setItem(PLAYER_COLLAPSE_KEY, next ? "1" : "0");
    onCollapsedChange(next);
    if (next) setDetailsOpen(false);
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
        data-player-control="1"
      >
        <span className={npStyles["now-playing__chev"]} aria-hidden="true">
          {collapsed ? "▲" : "▼"}
        </span>
      </button>
      <div
        className={npStyles["now-playing__bar"]}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("[data-player-control='1']")) return;
          setDetailsOpen((v) => !v);
        }}
      >
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
        <div className={npStyles["now-playing__progress"]}>
          <span className={npStyles["now-playing__time"]}>{elapsedLabel}</span>
          <div
            className={npStyles["now-playing__progress-track"]}
            role="slider"
            aria-label={t(locale, "home_player_seek_aria")}
            aria-valuemin={0}
            aria-valuemax={durationSec}
            aria-valuenow={Math.round(elapsedSec)}
            aria-valuetext={`${elapsedLabel} / ${durationLabel}`}
            tabIndex={0}
            data-player-control="1"
            onPointerDown={(e) => {
              seekToByClientX(e.clientX, e.currentTarget);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                e.preventDefault();
                const next = Math.min(durationSec, elapsedBaseRef.current + 5);
                elapsedBaseRef.current = next;
                setElapsedSec(next);
                startedAtRef.current = playing ? Date.now() : null;
              }
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                const next = Math.max(0, elapsedBaseRef.current - 5);
                elapsedBaseRef.current = next;
                setElapsedSec(next);
                startedAtRef.current = playing ? Date.now() : null;
              }
            }}
          >
            <span
              className={npStyles["now-playing__progress-fill"]}
              style={{ width: `${Math.max(4, progress * 100)}%` }}
            />
          </div>
          <span className={npStyles["now-playing__time"]}>{durationLabel}</span>
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
            onClick={resetTrack}
            data-player-control="1"
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
            data-player-control="1"
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
            onClick={resetTrack}
            data-player-control="1"
          >
            ⏭
          </button>
        </div>
      </div>
      <div
        className={`${npStyles["player-overlay"]}${detailsOpen ? ` ${npStyles["player-overlay--open"]}` : ""}`}
        aria-hidden={!detailsOpen}
        onClick={() => setDetailsOpen(false)}
      >
        <section
          className={npStyles["player-overlay__sheet"]}
          role="dialog"
          aria-modal="true"
          aria-label={t(locale, "home_player_details_title")}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className={npStyles["player-overlay__close"]}
            onClick={() => setDetailsOpen(false)}
            data-player-control="1"
          >
            ✕
          </button>
          <p className={npStyles["player-overlay__title"]}>{t(locale, "home_player_details_title")}</p>
          <p className={npStyles["player-overlay__text"]}>{t(locale, "home_player_details_body")}</p>
        </section>
      </div>
    </div>
  );
}
