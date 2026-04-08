import { getLocale, setLocale, t, subscribeLocale } from "./i18n.js";
import { startRouter, getRoute } from "./router.js";
import { createHeader } from "./header.js";
import { fetchSiteConfig, installMockFetchInterceptor } from "./mockApi.js";
import { mountSoundWave } from "./soundWave.js";

installMockFetchInterceptor();

const app = document.getElementById("app");
if (!app) throw new Error("#app missing");

let siteConfigPromise = fetchSiteConfig();

function renderPage(locale) {
  const route = getRoute();
  const main = document.createElement("main");
  main.className = "main-area";

  const box = document.createElement("div");
  box.className = "page-placeholder";

  const titleKey =
    route === "chat"
      ? "page_chat_title"
      : route === "help"
        ? "page_help_title"
        : "page_home_title";
  const bodyKey =
    route === "chat"
      ? "page_chat_body"
      : route === "help"
        ? "page_help_body"
        : "page_home_body";

  const h1 = document.createElement("h1");
  h1.className = "page-title";
  h1.textContent = t(locale, titleKey);

  const p = document.createElement("p");
  p.textContent = t(locale, bodyKey);

  box.appendChild(h1);
  if (route === "home") {
    const waveAnchor = document.createElement("div");
    waveAnchor.className = "sound-wave-anchor";
    box.appendChild(waveAnchor);
    const cleanupWave = mountSoundWave(waveAnchor);
    main.__waveCleanup = cleanupWave;
  } else {
    main.__waveCleanup = null;
  }
  box.appendChild(p);
  main.appendChild(box);
  return main;
}

function mount() {
  const locale = getLocale();
  setLocale(locale);

  const existingHeader = app.querySelector("header.site-header");
  if (!existingHeader) {
    const header = createHeader({ locale, onLocaleChange: () => mount() });
    header.dataset.locale = locale;
    app.prepend(header);
  } else if (existingHeader.dataset.locale !== locale) {
    const header = createHeader({ locale, onLocaleChange: () => mount() });
    header.dataset.locale = locale;
    existingHeader.replaceWith(header);
  }

  const oldMain = app.querySelector("main.main-area");
  if (oldMain && typeof oldMain.__waveCleanup === "function") {
    oldMain.__waveCleanup();
  }

  const nextMain = renderPage(locale);
  if (oldMain) {
    oldMain.replaceWith(nextMain);
  } else {
    app.appendChild(nextMain);
  }

  siteConfigPromise.then((cfg) => {
    const hint = document.querySelector(".page-placeholder p");
    if (hint && getRoute() === "home") {
      hint.textContent = `${t(locale, "page_home_body")} (${cfg.appName} mock v${cfg.version})`;
    }
  });
}

startRouter(mount);
subscribeLocale(mount);
