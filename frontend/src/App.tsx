import { useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { getLocale, setLocale, subscribeLocale } from "./lib/i18n";
import { installMockFetchInterceptor } from "./lib/mockApi";
import { GridLoupeLayer } from "./components/GridLoupeLayer";
import { Header } from "./components/Header/Header";
import { HomePage } from "./components/Home/HomePage";
import { HelpPage } from "./components/Help/HelpPage";
import { AuthPage } from "./components/Auth/AuthPage";
import { ChatPage } from "./components/Chat/ChatPage";
import { SavedConcertsPage } from "./components/SavedConcerts/SavedConcertsPage";
import { ProfilePage } from "./components/Profile/ProfilePage";
import { SubscriptionsPage } from "./components/Subscriptions/SubscriptionsPage";
import { NowPlaying } from "./components/Home/NowPlaying";
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
  const isAuth = path === "/auth";
  const isChat = path === "/chat";
  const isHome = path === "/";
  const isFitViewport = path === "/profile" || path === "/subscriptions";

  useEffect(() => {
    const cls = "route-chat";
    if (isChat) {
      document.body.classList.add(cls);
      return () => document.body.classList.remove(cls);
    }
    document.body.classList.remove(cls);
    return undefined;
  }, [isChat]);

  useEffect(() => {
    document.body.classList.toggle("route-home", isHome);
    return () => document.body.classList.remove("route-home");
  }, [isHome]);

  useEffect(() => {
    document.body.classList.toggle("route-fit-viewport", isFitViewport);
    return () => document.body.classList.remove("route-fit-viewport");
  }, [isFitViewport]);

  const mainClass = [
    layoutStyles["main-area"],
    isFitViewport ? layoutStyles["main-area--fit-viewport"] : "",
    !isChat && !playerCollapsed ? layoutStyles["main-area--with-player"] : "",
    !isChat && playerCollapsed ? layoutStyles["main-area--with-player-collapsed"] : "",
    isChat && !playerCollapsed ? layoutStyles["main-area--chat-player"] : "",
    isChat && playerCollapsed ? layoutStyles["main-area--chat-player-collapsed"] : "",
    isAuth ? layoutStyles["main-area--auth"] : "",
    isChat ? layoutStyles["main-area--chat"] : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <Header locale={locale} onAuthChange={() => bumpHeader((n) => n + 1)} />
      <main className={mainClass}>
        <GridLoupeLayer />
        <div className={layoutStyles["main-area__stack"]}>
          <Routes>
            <Route
              path="/"
              element={
                <HomePage locale={locale} />
              }
            />
            <Route path="/chat" element={<ChatPage locale={locale} />} />
            <Route path="/saved-concerts" element={<SavedConcertsPage locale={locale} />} />
            <Route path="/subscriptions" element={<SubscriptionsPage locale={locale} />} />
            <Route path="/profile" element={<ProfilePage locale={locale} />} />
            <Route path="/help" element={<HelpPage locale={locale} />} />
            <Route path="/auth" element={<AuthPage locale={locale} />} />
          </Routes>
        </div>
      </main>
      <NowPlaying locale={locale} onCollapsedChange={setPlayerCollapsed} />
    </>
  );
}

export default function App() {
  return <AppRoutes />;
}
