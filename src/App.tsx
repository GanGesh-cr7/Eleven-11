import { lazy, Suspense, useEffect } from "react";
import { useLocation, Routes, Route } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { Header, Footer } from "./components/Shell";
import { Home, GameEntry } from "./pages/Home";
import { Privacy, NotFound } from "./pages/Information";
import { loadQuestions, loadRoom } from "./lazy";

// Game screens pull in networking + animation code, so they load on demand
// (and are prefetched from the home page while the browser is idle).
const RoomRoute = lazy(() =>
  loadRoom().then((m) => ({ default: m.RoomRoute })),
);
const Questions = lazy(() =>
  loadQuestions().then((m) => ({ default: m.Questions })),
);

function RouteLoading() {
  return (
    <main className="center-state" aria-busy="true">
      <div className="state-icon">
        <LoaderCircle className="spin" />
      </div>
      <p>Loading…</p>
    </main>
  );
}

export default function App() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById("page-content")?.focus({ preventScroll: true });
  }, [location.pathname]);
  return (
    <>
      <a className="skip-link" href="#page-content">
        Skip to content
      </a>
      <Header />
      <div id="page-content" tabIndex={-1}>
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/create"
              element={<GameEntry key="create" mode="create" />}
            />
            <Route
              path="/join"
              element={<GameEntry key="join" mode="join" />}
            />
            <Route
              path="/join/:code"
              element={<GameEntry key={location.pathname} mode="join" />}
            />
            {["room", "game", "results", "summary"].map((p) => (
              <Route key={p} path={`/${p}/:code`} element={<RoomRoute />} />
            ))}
            <Route path="/questions" element={<Questions />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
      <Footer />
    </>
  );
}
