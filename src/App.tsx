import { useEffect } from "react";
import { useLocation, Routes, Route } from "react-router-dom";
import { Header, Footer } from "./components/Shell";
import { Home } from "./pages/Home";
import { RoomShell } from "./pages/GameRoom";
import { Questions } from "./pages/Questions";
import { Privacy, NotFound } from "./pages/Information";
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
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/join/:code" element={<Home />} />
          {["room", "game", "results", "summary"].map((p) => (
            <Route key={p} path={`/${p}/:code`} element={<RoomShell />} />
          ))}
          <Route path="/questions" element={<Questions />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <Footer />
    </>
  );
}
