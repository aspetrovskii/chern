import { getLocale, setLocale, t, subscribeLocale } from "./i18n.js";
import { startRouter, getRoute } from "./router.js";
import { createHeader } from "./header.js";
import { fetchSiteConfig, installMockFetchInterceptor } from "./mockApi.js";

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
  h1.innerHTML = `<span class="text-brand">${t(locale, titleKey)}</span>`;

  const p = document.createElement("p");
  p.textContent = t(locale, bodyKey);

  box.appendChild(h1);
  box.appendChild(p);
  main.appendChild(box);
  return main;
}

function mount() {
  const locale = getLocale();
  setLocale(locale);

  app.replaceChildren();

  const onLocaleChange = () => mount();

  const header = createHeader({ locale, onLocaleChange });
  app.appendChild(header);
  app.appendChild(renderPage(locale));

  siteConfigPromise.then((cfg) => {
    const hint = document.querySelector(".page-placeholder p");
    if (hint && getRoute() === "home") {
      hint.textContent = `${t(locale, "page_home_body")} (${cfg.appName} mock v${cfg.version})`;
    }
  });
}

startRouter(mount);
subscribeLocale(mount);
