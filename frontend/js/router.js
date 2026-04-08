/** @typedef {'home'|'chat'|'help'} RouteName */

const ROUTES = /** @type {const} */ ({
  home: "",
  chat: "chat",
  help: "help",
});

function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, "") || "";
  const segment = raw.split("/")[0] || "";
  if (segment === ROUTES.chat) return "chat";
  if (segment === ROUTES.help) return "help";
  return "home";
}

/** @param {() => void} listener */
export function startRouter(listener) {
  window.addEventListener("hashchange", listener);
  listener();
}

/** @returns {RouteName} */
export function getRoute() {
  return parseHash();
}

/** @param {RouteName} name */
export function navigate(name) {
  if (name === "home") window.location.hash = "#/";
  else window.location.hash = `#/${ROUTES[name]}`;
}
