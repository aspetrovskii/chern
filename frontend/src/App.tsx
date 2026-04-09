import { useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { getLocale, setLocale, subscribeLocale } from "./lib/i18n";
import { installMockFetchInterceptor } from "./lib/mockApi";
import { Header } from "./components/Header/Header";
import { HomePage } from "./components/Home/HomePage";
import { HelpPage } from "./components/Help/HelpPage";
import { AuthPage } from "./components/Auth/AuthPage";
import { ChatPlaceholder } from "./components/ChatPlaceholder";
import layoutStyles from "./components/MainLayout.module.css";

const PLAYER_COLLAPSE_KEY = "conce-home-player-collapsed";

function AppRoutes() {
  const location = useLocation();
  const [locale, setLocaleState] = useState(getLocale);
  const [, bumpHeader] = useState(0);
  const [playerCollapsed, setPlayerCollapsed] = useState(
    () => localStorage.getItem(PLAYER_COLLAPSE_KEY) === "1"
  );

  useEffect(() => {
    installMockFetchInterceptor();
  }, []);

  useEffect(() => {
    setLocale(locale);
  }, [locale]);

  useEffect(() => {
    return subscribeLocale(() => setLocaleState(getLocale()));
  }, []);

  useEffect(() => {
    const onAuth = () => bumpHeader((n) => n + 1);
    window.addEventListener("conce-auth-success", onAuth);
    return () => window.removeEventListener("conce-auth-success", onAuth);
  }, []);

  const path = location.pathname;
  const isHome = path === "/" || path === "";
  const isAuth = path === "/auth";

  const mainClass = [
    layoutStyles["main-area"],
    isHome ? layoutStyles["main-area--home"] : "",
    isHome && playerCollapsed ? layoutStyles["main-area--home-collapsed"] : "",
    isAuth ? layoutStyles["main-area--auth"] : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <Header locale={locale} onAuthChange={() => bumpHeader((n) => n + 1)} />
      <main className={mainClass}>
        <Routes>
          <Route
            path="/"
            element={
              <HomePage locale={locale} onPlayerCollapsedChange={setPlayerCollapsed} />
            }
          />
          <Route path="/chat" element={<ChatPlaceholder locale={locale} />} />
          <Route path="/help" element={<HelpPage locale={locale} />} />
          <Route path="/auth" element={<AuthPage locale={locale} />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return <AppRoutes />;
}
