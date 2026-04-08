import { getLocale, setLocale, t, subscribeLocale } from "./i18n.js";
import { startRouter, getRoute } from "./router.js";
import { createHeader } from "./header.js";
import { installMockFetchInterceptor } from "./mockApi.js";
import { mountHomeUi } from "./homeUi.js";
import { mountHelpPage } from "./helpPage.js";

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
    main.__dispose = mountHomeUi(locale, box);
  } else if (route === "help") {
    main.__dispose = mountHelpPage(locale, box);
  } else {
    main.__dispose = null;
    const h1 = document.createElement("h1");
    h1.className = "page-title";
    h1.textContent = t(locale, "page_chat_title");

    const p = document.createElement("p");
    p.textContent = t(locale, "page_chat_body");

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
  if (oldMain && typeof oldMain.__dispose === "function") {
    oldMain.__dispose();
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
