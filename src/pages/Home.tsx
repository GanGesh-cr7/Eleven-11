import { useState, useEffect, useRef, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Link2,
  LoaderCircle,
  MessageCircle,
  Plus,
  ShieldCheck,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { codeValid } from "../network/code";
import { loadRoom, loadSession, whenIdle } from "../lazy";

/**
 * The home page paints without the networking bundle. Once the browser is
 * idle we load it (so Create/Join feel instant) and watch for an active room.
 */
function useActiveRoom() {
  const [code, setCode] = useState<string>();
  useEffect(() => {
    let alive = true,
      off: (() => void) | undefined;
    const cancel = whenIdle(() => {
      void loadRoom();
      void loadSession().then(({ session }) => {
        if (!alive) return;
        const sync = () => setCode(session.getSnapshot().state?.code);
        sync();
        off = session.subscribe(sync);
      });
    });
    return () => {
      alive = false;
      cancel();
      off?.();
    };
  }, []);
  return code;
}
export function Home() {
  const activeRoom = useActiveRoom();
  return (
    <>
      <main className="home">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-star">✧</span> A LITTLE HONESTY. A LOT OF
              LAUGHTER.
            </div>
            <h1 className="party-title">
              <img src="/Logo.png" alt="" />
              Eleven<span>:11</span>
            </h1>
            <h2 className="party-tagline">
              Your friends. Your votes. Your secrets.
            </h2>
            <p className="hero-description">
              You think you know your friends. Let’s put that to a vote.
            </p>
            <div className="party-choices" aria-label="Choose how to play">
              <Link to="/create" className="party-choice choice-create">
                <span className="choice-art" aria-hidden="true">
                  <span className="choice-spark">✦</span>
                  <span className="choice-emoji">😎</span>
                  <span className="choice-bubble">WHO, ME?</span>
                </span>
                <strong>Host the fun</strong>
                <span className="choice-kicker">CREATE A ROOM</span>
                <span className="choice-description">
                  Your people. Your private game.
                </span>
              </Link>
              <Link to="/join" className="party-choice choice-join">
                <span className="choice-art" aria-hidden="true">
                  <span className="choice-emoji">🤭</span>
                  <span className="choice-emoji friend-emoji">😂</span>
                  <span className="choice-bubble">I’M IN!</span>
                </span>
                <strong>Bring the truth</strong>
                <span className="choice-kicker">JOIN YOUR FRIENDS</span>
                <span className="choice-description">
                  Have an invite? Get in here.
                </span>
              </Link>
            </div>
            <div className="hero-meta">
              <span>
                <Users size={15} /> 2–12 friends recommended
              </span>
              <span>
                <Zap size={14} /> Zero sign-ups. All fun.
              </span>
            </div>
            {activeRoom && (
              <Link className="text-link" to={`/room/${activeRoom}`}>
                Return to your active room <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </section>
        <section className="how-strip" aria-label="How it works">
          <div className="how-intro">
            <span className="eyebrow">LESS SETUP. MORE STORIES.</span>
            <h2>
              Three steps to
              <br /> “I knew it was you.”
            </h2>
          </div>
          <div className="mini-step">
            <span className="step-icon">
              <Users size={21} />
              <small>01</small>
            </span>
            <h3>Gather your favorites</h3>
            <p>
              Send a link. Bring the group.
              <br /> Across the table or across the world.
            </p>
          </div>
          <div className="mini-step">
            <span className="step-icon">
              <MessageCircle size={21} />
              <small>02</small>
            </span>
            <h3>Vote your instinct</h3>
            <p>
              One question. One honest vote.
              <br /> Your pick stays off the record.
            </p>
          </div>
          <div className="mini-step">
            <span className="step-icon">
              <Trophy size={21} />
              <small>03</small>
            </span>
            <h3>Let the truth unfold</h3>
            <p>
              The votes are in. The stories begin.
              <br /> Friendships (probably) intact.
            </p>
          </div>
        </section>
        <div className="home-bottom">
          <span>FOR THE “YOU HAD TO BE THERE” MOMENTS</span>
          <div>
            <span>✧</span> Same friends. New revelations. <span>✧</span>
          </div>
          <Link to="/questions">
            Find your kind of question <ArrowUpRight size={14} />
          </Link>
        </div>
      </main>
    </>
  );
}

export function GameEntry({ mode }: { mode: "create" | "join" }) {
  const { code: invite } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState(
    () => localStorage.getItem("eleven-name") || "",
  );
  const [code, setCode] = useState(invite || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const auto = useRef(false);
  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const clean = name.trim();
    if (!clean || clean.length > 20) {
      setError("Enter a name between 1 and 20 characters.");
      return;
    }
    const normalized = code.replace(/[\s-]/g, "").toUpperCase();
    if (mode === "join" && !codeValid(normalized)) {
      setError("Enter the 20-character code from your invitation.");
      return;
    }
    setError("");
    setBusy(true);
    localStorage.setItem("eleven-name", clean);
    try {
      const [{ session }, { readSavedQuestions }] = await Promise.all([
        loadSession(),
        import("../data/questions"),
      ]);
      if (mode === "create") {
        const c = await session.create(clean);
        for (const q of readSavedQuestions()) session.custom(q);
        navigate(`/room/${c}`);
      } else {
        await session.join(normalized, clean);
        navigate(`/room/${normalized}`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (invite && name.trim() && !auto.current) {
      auto.current = true;
      void submit();
    }
  }, []);
  return (
    <main className="home entry-page">
      <section className="hero">
        <div className="hero-copy">
          <Link className="text-link entry-back" to="/">
            <ArrowLeft size={16} /> Back to home
          </Link>
          <div className="panel entry-panel">
            <span className="entry-emoji" aria-hidden="true">
              {mode === "create" ? "😎" : "🤭"}
            </span>
            <div className="eyebrow">
              {mode === "create" ? "HOST THE FUN" : "BRING THE TRUTH"}
            </div>
            <h1>{mode === "create" ? "Create a game" : "Join your friends"}</h1>
            <p>
              {mode === "create"
                ? "Pick your name. We’ll make room for your people."
                : "Your friends are waiting. Grab your invitation code."}
            </p>
            <form className="join-form" onSubmit={submit}>
              <label htmlFor="nickname">What should we call you?</label>
              <div className="name-input">
                <span>
                  <Users size={17} />
                </span>
                <input
                  id="nickname"
                  autoComplete="nickname"
                  maxLength={20}
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <span className="input-counter">{name.length}/20</span>
              </div>
              {mode === "join" && (
                <label className="code-label">
                  Your room code
                  <input
                    autoFocus={!invite}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Paste your room code"
                    maxLength={40}
                    required
                    autoCapitalize="characters"
                  />
                </label>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <div className="home-actions">
                <Button type="submit" disabled={busy}>
                  {busy ? (
                    <LoaderCircle className="spin" size={18} />
                  ) : mode === "create" ? (
                    <Plus size={18} />
                  ) : (
                    <Link2 size={18} />
                  )}{" "}
                  {mode === "create" ? "Create a Game" : "Join this Game"}{" "}
                  <ArrowRight size={18} />
                </Button>
                <Button asChild variant="outline">
                  <Link to={mode === "create" ? "/join" : "/create"}>
                    {mode === "create" ? (
                      <Link2 size={17} />
                    ) : (
                      <Plus size={17} />
                    )}
                    {mode === "create" ? "Join a Game" : "Create instead"}
                  </Link>
                </Button>
              </div>
              <p className="form-note">
                <ShieldCheck size={13} /> Just a name. No accounts, no awkward
                introductions.
              </p>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
