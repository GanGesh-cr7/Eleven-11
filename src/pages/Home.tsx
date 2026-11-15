import { useState, useEffect, useRef, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  Link2,
  LoaderCircle,
  MessageCircle,
  Plus,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { useGame } from "../components/shared";
import { session } from "../network/session";
import { codeValid } from "../network/protocol";
import { readSavedQuestions } from "../data/questions";
export function HeroArt() {
  return (
    <div className="hero-art" aria-hidden="true">
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <span className="art-spark spark-one">✦</span>
      <span className="art-spark spark-two">✧</span>
      <span className="art-dot" />
      <div className="floating-label">
        <span>✧</span> A little friendly exposure.
      </div>
      <motion.div
        className="question-card"
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="card-eyebrow">
          <span>
            <Sparkles size={13} /> THE GROUP HAS QUESTIONS
          </span>
          <span>01 / ∞</span>
        </div>
        <div className="big-quotes">“</div>
        <h2>
          Who’s most likely to
          <br /> say “one more episode”
          <br /> <em>five episodes ago?</em>
        </h2>
        <div className="art-vote">
          <div className="emoji-avatar">😴</div>
          <div>
            <strong>We all know someone.</strong>
            <span>Let the votes do the talking.</span>
          </div>
          <span className="vote-check">
            <Check size={16} />
          </span>
        </div>
        <div className="art-card-bottom">
          <span>
            <span className="tiny-dot" /> Votes stay between us*
          </span>
          <span>
            00:30 <Clock3 size={12} />
          </span>
        </div>
      </motion.div>
      <div className="reaction reaction-laugh">😂</div>
      <div className="reaction reaction-eyes">👀</div>
      <div className="anonymous-sticker">
        <ShieldCheck size={17} />
        <span>
          No names on the votes.
          <br /> <b>Just a little suspense.</b>
        </span>
      </div>
      <span className="art-caption">
        *Hidden from players. Counted by the host.
      </span>
    </div>
  );
}

export function Home() {
  const { code: invite } = useParams();
  const navigate = useNavigate();
  const game = useGame();
  const [mode, setMode] = useState<"create" | "join">(
    invite ? "join" : "create",
  );
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
    <>
      <main className="home">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-star">✧</span> YOUR NEXT GROUP CHAT
              OBSESSION
            </div>
            <h1>
              Your friends.
              <br /> Your votes.
              <br /> <span>Your secrets.</span>
              <span className="headline-star">✳</span>
            </h1>
            <p className="hero-description">
              You think you know your friends.
              <br /> Let’s put that to a vote.
            </p>
            <div className="hero-meta">
              <span>
                <Users size={16} /> 2–12 friends recommended
              </span>
              <span className="meta-divider" />
              <span>
                <Zap size={15} /> Zero sign-ups. All fun.
              </span>
            </div>
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMode(mode === "create" ? "join" : "create");
                    setError("");
                  }}
                >
                  {mode === "create" ? (
                    <>
                      <Link2 size={17} /> Join a Game
                    </>
                  ) : (
                    <>
                      <Plus size={17} /> Create instead
                    </>
                  )}
                </Button>
              </div>
              <p className="form-note">
                <ShieldCheck size={13} /> Just a name. No accounts, no awkward
                introductions.
              </p>
            </form>
            {game.state && (
              <Link className="text-link" to={`/room/${game.state.code}`}>
                Return to your active room <ArrowRight size={14} />
              </Link>
            )}
          </div>
          <HeroArt />
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
