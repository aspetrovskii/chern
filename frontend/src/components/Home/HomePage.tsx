import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { t, type Locale } from "../../lib/i18n";
import brandStyles from "../BrandText.module.css";
import neoStyles from "../NeoSurface.module.css";
import homeStyles from "./HomePage.module.css";
import { NowPlaying } from "./NowPlaying";

const PLACEHOLDER_PROMPTS: Record<Locale, string[]> = {
  en: [
    "Late-night synthwave — neon glow and steady pulse",
    "Soft indie with rainy-window melancholy",
    "Breakneck rock: razor riffs, thunder drums",
    "Lo-fi beats to study without losing the groove",
    "Cinematic strings — slow build, epic peak",
  ],
  ru: [
    "Ночной синти и неон — ровный пульс до рассвета",
    "Инди с дождём за окном — тихая грусть",
    "Резкий рок: пилящие риффы и удар в лоб",
    "Lo-fi для концентрации — без скуки в плейлисте",
    "Кино-оркестр: нарастание, кульминация, финал",
  ],
  tr: [
    "Gece yolculuğu synthwave — neon ve düzenli nabız",
    "Yağmurlu cam melankolisi — yumuşak indie",
    "Keskin rock: testere riffler, gök gürültüsü davul",
    "Çalışırken lo-fi — groove kaybetmeden",
    "Sinematik yaylılar — yavaş yükseliş, destansı doruk",
  ],
  hi: [
    "रात की ड्राइव सिंथवेव — नियॉन चमक, स्थिर ताल",
    "बारिश वाली खिड़की — नरम इंडी उदासी",
    "तेज़ रॉक: धारदार रिफ़, गरजता ढोल",
    "पढ़ाई के लिए लो-फाई — groove बरकरार",
    "सिनेमैटिक स्ट्रिंग्स — धीमी चढ़ान, महाकाव्य चोटी",
  ],
  zh: [
    "深夜合成器浪潮 — 霓虹光晕与稳定脉搏",
    "雨窗边的独立民谣 — 轻柔忧郁",
    "疾速摇滚：利刃连复段与雷鸣鼓点",
    "专注用的低保真 — 律动不散",
    "电影感弦乐 — 渐强、高潮、收束",
  ],
};

type HomePageProps = {
  locale: Locale;
  onPlayerCollapsedChange: (collapsed: boolean) => void;
};

export function HomePage({ locale, onPlayerCollapsedChange }: HomePageProps) {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");
  const [ghost, setGhost] = useState("");
  const [focused, setFocused] = useState(false);
  const typeTimerRef = useRef(0);
  const promptIdxRef = useRef(0);
  const charIdxRef = useRef(0);
  const deletingRef = useRef(false);

  const prompts = PLACEHOLDER_PROMPTS[locale] ?? PLACEHOLDER_PROMPTS.en;
  const reduceMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const showGhost = useCallback(() => {
    const empty = !inputValue.trim();
    return empty && !focused;
  }, [inputValue, focused]);

  const tickTypewriter = useCallback(() => {
    const full = prompts[promptIdxRef.current % prompts.length];
    if (!deletingRef.current) {
      charIdxRef.current = Math.min(charIdxRef.current + 1, full.length);
      setGhost(full.slice(0, charIdxRef.current));
      if (charIdxRef.current >= full.length) {
        deletingRef.current = true;
        typeTimerRef.current = window.setTimeout(tickTypewriter, 2200);
        return;
      }
    } else {
      charIdxRef.current = Math.max(0, charIdxRef.current - 1);
      setGhost(full.slice(0, charIdxRef.current));
      if (charIdxRef.current <= 0) {
        deletingRef.current = false;
        promptIdxRef.current++;
      }
    }
    const delay = deletingRef.current ? 28 + Math.random() * 22 : 42 + Math.random() * 28;
    typeTimerRef.current = window.setTimeout(tickTypewriter, delay);
  }, [prompts]);

  useEffect(() => {
    window.clearTimeout(typeTimerRef.current);
    if (reduceMotion) {
      setGhost(prompts[0] ?? "");
      return;
    }
    promptIdxRef.current = 0;
    charIdxRef.current = 0;
    deletingRef.current = false;
    tickTypewriter();
    return () => window.clearTimeout(typeTimerRef.current);
  }, [locale, prompts, reduceMotion, tickTypewriter]);

  const goChat = () => navigate("/chat");

  return (
    <div className={homeStyles["home-page"]}>
      <div className={homeStyles["home-shell"]}>
        <section className={`${neoStyles["neo-surface"]} ${neoStyles["neo-surface--hero"]}`}>
          <p className={homeStyles["home-hero__lead"]}>{t(locale, "home_hero_lead")}</p>
          <div className={homeStyles["home-input-brand"]}>
            <span className={`${brandStyles["logo-text"]} ${homeStyles["home-input-brand__logo"]}`}>
              {t(locale, "brand")}
            </span>
          </div>
          <div className={homeStyles["home-input-wrap"]}>
            <div className={homeStyles["home-input-field"]}>
              <span
                className={homeStyles["home-input__ghost"]}
                aria-hidden="true"
                style={{ display: showGhost() ? undefined : "none" }}
              >
                {ghost}
              </span>
              <input
                type="text"
                className={homeStyles["home-input"]}
                autoComplete="off"
                aria-label={t(locale, "home_input_aria")}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    goChat();
                  }
                }}
              />
            </div>
            <button
              type="button"
              className={homeStyles["home-send"]}
              aria-label={t(locale, "home_send_aria")}
              onClick={goChat}
            >
              <span className={homeStyles["home-send__icon"]} aria-hidden="true">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M5 12h14M13 5l7 7-7 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
          </div>
        </section>
        <div className={homeStyles["home-player-mount"]}>
          <NowPlaying locale={locale} onCollapsedChange={onPlayerCollapsedChange} />
        </div>
      </div>
    </div>
  );
}
