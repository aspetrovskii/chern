import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { t, type Locale } from "../../lib/i18n";
import neoStyles from "../NeoSurface.module.css";
import homeStyles from "./HomePage.module.css";

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
  ur: [
    "رات کا سنتھی ویو — نیون چمک اور مستقل دھڑکن",
    "بارش والی کھڑکی — نرم انڈی اداسی",
    "تیز راک: تیز رفز، گرجتے ڈرم",
    "پڑھائی کے لیے لو-فائی — groove برقرار",
    "سینمیٹک سٹرنگز — آہستہ چڑھاؤ، شاندار چوٹی",
  ],
  id: [
    "Synthwave larut malam — neon dan denyut stabil",
    "Indie lembut dengan melankoli jendela hujan",
    "Rock cepat: riff tajam, drum menggelegar",
    "Lo-fi untuk belajar tanpa kehilangan groove",
    "Orkestra sinematik — naik perlahan, puncak epik",
  ],
  es: [
    "Synthwave nocturno — brillo neón y pulso constante",
    "Indie suave con melancolía de ventana lluviosa",
    "Rock vertiginoso: riffs afilados, batería atronadora",
    "Lo-fi para estudiar sin perder el groove",
    "Cuerdas cinematográficas — subida lenta, clímax épico",
  ],
  de: [
    "Nacht-Synthwave — Neonschein und stetiger Puls",
    "Sanftes Indie mit Regenfenster-Melancholie",
    "Rasender Rock: scharfe Riffs, donnernde Drums",
    "Lo-fi zum Lernen — der Groove bleibt",
    "Cinematic Strings — langsamer Aufbau, epischer Höhepunkt",
  ],
};

type HomePageProps = { locale: Locale };

const GITHUB_REPO_URL = "https://github.com/aspetrovskii/chern";

export function HomePage({ locale }: HomePageProps) {
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
        <section
          className={`${neoStyles["neo-surface"]} ${neoStyles["neo-surface--hero"]} ${neoStyles["neo-surface--hero-concert"]}`}
        >
          <p className={homeStyles["home-hero__lead"]}>{t(locale, "home_hero_lead")}</p>
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
        <section className={`${neoStyles["neo-surface"]} ${homeStyles["home-trust"]}`}>
          <h2 className={homeStyles["home-trust__title"]}>{t(locale, "home_trust_title")}</h2>
          <p className={homeStyles["home-trust__body"]}>{t(locale, "home_trust_body")}</p>
          <a
            className={homeStyles["home-trust__github"]}
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t(locale, "home_trust_github_cta")}
            <span className={homeStyles["home-trust__github-icon"]} aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </span>
          </a>
        </section>
      </div>
    </div>
  );
}
