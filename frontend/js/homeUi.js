import { t } from "./i18n.js";
import { navigate } from "./router.js";

/** @typedef {import('./i18n.js').Locale} Locale */

/** @type {Record<Locale, string[]>} */
const PLACEHOLDER_PROMPTS = {
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

const PLAYER_COLLAPSE_KEY = "conce-home-player-collapsed";

/**
 * @param {Locale} locale
 * @param {HTMLElement} container
 */
export function mountHomeUi(locale, container) {
  const shell = document.createElement("div");
  shell.className = "home-shell";

  const hero = document.createElement("section");
  hero.className = "home-hero neo-surface neo-surface--hero";

  const lead = document.createElement("p");
  lead.className = "home-hero__lead";
  lead.textContent = t(locale, "home_hero_lead");

  const inputBrandRow = document.createElement("div");
  inputBrandRow.className = "home-input-brand";
  const brandOverInput = document.createElement("span");
  brandOverInput.className = "logo-text home-input-brand__logo";
  brandOverInput.textContent = t(locale, "brand");
  inputBrandRow.appendChild(brandOverInput);

  const inputWrap = document.createElement("div");
  inputWrap.className = "home-input-wrap";

  const field = document.createElement("div");
  field.className = "home-input-field";

  const fakePh = document.createElement("span");
  fakePh.className = "home-input__ghost";
  fakePh.setAttribute("aria-hidden", "true");

  const input = document.createElement("input");
  input.type = "text";
  input.className = "home-input neo-inset";
  input.setAttribute("autocomplete", "off");
  input.setAttribute("aria-label", t(locale, "home_input_aria"));

  const send = document.createElement("button");
  send.type = "button";
  send.className = "home-send neo-raised";
  send.setAttribute("aria-label", t(locale, "home_send_aria"));
  send.innerHTML =
    '<span class="home-send__icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';

  field.appendChild(fakePh);
  field.appendChild(input);
  inputWrap.appendChild(field);
  inputWrap.appendChild(send);

  hero.appendChild(lead);
  hero.appendChild(inputBrandRow);
  hero.appendChild(inputWrap);

  const playerMount = document.createElement("div");
  playerMount.className = "home-player-mount";

  shell.appendChild(hero);

  shell.appendChild(playerMount);
  container.appendChild(shell);

  const prompts = PLACEHOLDER_PROMPTS[locale] || PLACEHOLDER_PROMPTS.en;
  let promptIdx = 0;
  let charIdx = 0;
  let deleting = false;
  let typeTimer = 0;

  function showGhost() {
    const empty = !input.value.trim();
    fakePh.style.display = empty && document.activeElement !== input ? "" : "none";
  }

  function tickTypewriter() {
    const full = prompts[promptIdx % prompts.length];
    if (!deleting) {
      charIdx = Math.min(charIdx + 1, full.length);
      fakePh.textContent = full.slice(0, charIdx);
      if (charIdx >= full.length) {
        deleting = true;
        typeTimer = window.setTimeout(tickTypewriter, 2200);
        return;
      }
    } else {
      charIdx = Math.max(0, charIdx - 1);
      fakePh.textContent = full.slice(0, charIdx);
      if (charIdx <= 0) {
        deleting = false;
        promptIdx++;
      }
    }
    const delay = deleting ? 28 + Math.random() * 22 : 42 + Math.random() * 28;
    typeTimer = window.setTimeout(tickTypewriter, delay);
  }

  showGhost();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    fakePh.textContent = prompts[0];
  } else {
    tickTypewriter();
  }

  input.addEventListener("focus", showGhost);
  input.addEventListener("blur", showGhost);
  input.addEventListener("input", showGhost);

  send.addEventListener("click", () => {
    navigate("chat");
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      navigate("chat");
    }
  });

  const playerCleanup = mountNowPlaying(locale, playerMount);

  return function cleanup() {
    window.clearTimeout(typeTimer);
    playerCleanup();
    if (shell.parentNode) shell.parentNode.removeChild(shell);
  };
}

/**
 * @param {Locale} locale
 * @param {HTMLElement} mountEl
 */
function mountNowPlaying(locale, mountEl) {
  const collapsed = localStorage.getItem(PLAYER_COLLAPSE_KEY) === "1";

  const root = document.createElement("div");
  root.className = "now-playing" + (collapsed ? " now-playing--collapsed" : "");

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "now-playing__toggle neo-raised";
  toggle.setAttribute(
    "aria-expanded",
    collapsed ? "false" : "true"
  );
  toggle.setAttribute("aria-label", t(locale, "home_player_toggle_aria"));
  toggle.innerHTML = `<span class="now-playing__chev" aria-hidden="true">${collapsed ? "▲" : "▼"}</span>`;

  const bar = document.createElement("div");
  bar.className = "now-playing__bar neo-surface neo-surface--player";

  const art = document.createElement("div");
  art.className = "now-playing__art";
  art.setAttribute("aria-hidden", "true");
  art.innerHTML = `<svg class="now-playing__art-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M11 4.5L5.5 9H3v6h2.5l5.5 4.5V4.5z" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round"/>
    <path d="M15.5 8.5a5 5 0 010 7" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/>
    <path d="M17.5 6.5a8 8 0 010 11" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/>
  </svg>`;

  const meta = document.createElement("div");
  meta.className = "now-playing__meta";

  const label = document.createElement("span");
  label.className = "now-playing__label";
  label.textContent = t(locale, "home_player_label");

  const track = document.createElement("span");
  track.className = "now-playing__track";
  track.textContent = t(locale, "home_player_track");

  meta.appendChild(label);
  meta.appendChild(track);

  let playing = false;

  const eq = document.createElement("div");
  eq.className = "now-playing__eq" + (playing ? "" : " now-playing__eq--paused");
  eq.setAttribute("aria-hidden", "true");
  const barCount = 7;
  for (let i = 0; i < barCount; i++) {
    const span = document.createElement("span");
    span.className = "now-playing__eq-bar";
    eq.appendChild(span);
  }

  const controls = document.createElement("div");
  controls.className = "now-playing__controls";

  const btnPrev = document.createElement("button");
  btnPrev.type = "button";
  btnPrev.className = "now-playing__btn neo-raised";
  btnPrev.setAttribute("aria-label", t(locale, "home_player_prev_aria"));
  btnPrev.textContent = "⏮";

  const btnPlay = document.createElement("button");
  btnPlay.type = "button";
  btnPlay.className = "now-playing__btn now-playing__btn--play neo-raised";

  function playIconSvg() {
    return `<svg class="now-playing__btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6.5v11l9.5-5.5L9 6.5z" fill="currentColor"/></svg>`;
  }

  function pauseIconSvg() {
    return `<svg class="now-playing__btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6.5h3.5v11H8v-11zm4.5 0H16v11h-3.5v-11z" fill="currentColor"/></svg>`;
  }

  function syncPlayButton() {
    btnPlay.innerHTML = playing ? pauseIconSvg() : playIconSvg();
    btnPlay.setAttribute(
      "aria-label",
      playing ? t(locale, "home_player_pause_aria") : t(locale, "home_player_play_aria")
    );
    eq.classList.toggle("now-playing__eq--paused", !playing);
  }

  syncPlayButton();

  btnPlay.addEventListener("click", () => {
    playing = !playing;
    syncPlayButton();
  });

  const btnNext = document.createElement("button");
  btnNext.type = "button";
  btnNext.className = "now-playing__btn neo-raised";
  btnNext.setAttribute("aria-label", t(locale, "home_player_next_aria"));
  btnNext.textContent = "⏭";

  controls.appendChild(btnPrev);
  controls.appendChild(btnPlay);
  controls.appendChild(btnNext);

  bar.appendChild(art);
  bar.appendChild(meta);
  bar.appendChild(eq);
  bar.appendChild(controls);

  root.appendChild(toggle);
  root.appendChild(bar);
  mountEl.appendChild(root);

  function applyCollapsed(next) {
    if (next) {
      root.classList.add("now-playing--collapsed");
      toggle.querySelector(".now-playing__chev").textContent = "▲";
      toggle.setAttribute("aria-expanded", "false");
    } else {
      root.classList.remove("now-playing--collapsed");
      toggle.querySelector(".now-playing__chev").textContent = "▼";
      toggle.setAttribute("aria-expanded", "true");
    }
    localStorage.setItem(PLAYER_COLLAPSE_KEY, next ? "1" : "0");
  }

  toggle.addEventListener("click", () => {
    applyCollapsed(!root.classList.contains("now-playing--collapsed"));
  });

  return function cleanupPlayer() {
    if (root.parentNode) root.parentNode.removeChild(root);
  };
}
