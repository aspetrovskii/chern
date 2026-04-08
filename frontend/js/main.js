import { getLocale, setLocale, t, subscribeLocale } from "./i18n.js";
import { startRouter, getRoute } from "./router.js";
import { createHeader } from "./header.js";
import { installMockFetchInterceptor } from "./mockApi.js";
import { mountHomeUi } from "./homeUi.js";

installMockFetchInterceptor();

const app = document.getElementById("app");
if (!app) throw new Error("#app missing");

function renderPage(locale) {
  const route = getRoute();
  const main = document.createElement("main");
  main.className = route === "home" ? "main-area main-area--home" : "main-area";

  const box = document.createElement("div");
  box.className = route === "home" ? "home-page" : "page-placeholder";

  if (route === "home") {
    const cleanupHome = mountHomeUi(locale, box);
    main.__homeCleanup = cleanupHome;
  } else {
    main.__homeCleanup = null;
    const titleKey =
      route === "chat" ? "page_chat_title" : "page_help_title";
    const bodyKey = route === "chat" ? "page_chat_body" : "page_help_body";

    const h1 = document.createElement("h1");
    h1.className = "page-title";
    h1.textContent = t(locale, titleKey);

    const p = document.createElement("p");
    p.textContent = t(locale, bodyKey);

    box.appendChild(h1);
    box.appendChild(p);
  }
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
  if (oldMain && typeof oldMain.__homeCleanup === "function") {
    oldMain.__homeCleanup();
  }

  const nextMain = renderPage(locale);
  if (oldMain) {
    oldMain.replaceWith(nextMain);
  } else {
    app.appendChild(nextMain);
  }

}

startRouter(mount);
subscribeLocale(mount);
