import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Check,
  CheckCheck,
  Copy,
  Crown,
  Link2,
  LoaderCircle,
  LogOut,
  Plus,
  Radio,
  Search,
  Settings2,
  Share2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Avatar, Modal, useGame, title } from "../components/shared";
import { session } from "../network/session";
import { categories, questionSchema, type Settings } from "../game/types";
import { questions, readSavedQuestions } from "../data/questions";
export function ShareRoom({ code }: { code: string }) {
  const [copied, setCopied] = useState("");
  const [fallback, setFallback] = useState(false);
  const url = `${location.origin}/join/${code}`;
  async function copy(text: string, kind: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(""), 2500);
    } catch {
      setFallback(true);
    }
  }
  return (
    <>
      <div className="invite-box">
        <div>
          <span className="eyebrow">YOUR PRIVATE ROOM</span>
          <strong className="room-code">
            {code.match(/.{1,5}/g)?.join(" ")}
          </strong>
        </div>
        <Button
          variant="ghost"
          aria-label="Copy room code"
          onClick={() => copy(code, "code")}
        >
          {copied === "code" ? <Check size={19} /> : <Copy size={19} />}
        </Button>
      </div>
      <div className="share-actions">
        <Button variant="outline" onClick={() => copy(url, "link")}>
          {copied === "link" ? <Check size={16} /> : <Link2 size={16} />}{" "}
          {copied === "link" ? "Copied invitation" : "Copy invite link"}
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            try {
              if (navigator.share)
                await navigator.share({
                  title: "Join my Eleven:11 game",
                  text: "Your friends. Your votes. Your secrets.",
                  url,
                });
              else setFallback(true);
            } catch (e) {
              if ((e as Error).name !== "AbortError") setFallback(true);
            }
          }}
        >
          <Share2 size={16} /> Share
        </Button>
      </div>
      {fallback && (
        <div className="fallback">
          <label>
            Send this invitation to your friends
            <input readOnly value={url} onFocus={(e) => e.target.select()} />
          </label>
        </div>
      )}
    </>
  );
}

export function RoomShell() {
  const { code = "" } = useParams();
  const game = useGame();
  const navigate = useNavigate();
  const restored = useRef(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  useEffect(() => {
    if (!game.state && !restored.current) {
      restored.current = true;
      void session.restore(code);
    }
  }, [code, game.state]);
  useEffect(() => {
    if (!game.state) return;
    const route = {
      lobby: "room",
      voting: "game",
      results: "results",
      summary: "summary",
    }[game.state.phase];
    navigate(`/${route}/${game.state.code}`, { replace: true });
  }, [game.state?.phase, game.state?.code, navigate]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (game.isHost && game.state && game.state.phase !== "summary")
        e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [game.isHost, !!game.state]);
  if (!game.state)
    return (
      <main className="center-state">
        <div className="state-icon">
          {game.status === "connecting" ? (
            <LoaderCircle className="spin" />
          ) : (
            <Radio />
          )}
        </div>
        <h1>
          {game.status === "connecting"
            ? "Finding your people…"
            : "Let’s get you connected."}
        </h1>
        <p>
          {game.error ||
            "Join with your name and the room invitation. Refreshing a host page ends its game."}
        </p>
        {game.status === "connecting" ? (
          <p className="fine">
            Connecting through public Nostr relays. This can take up to 30
            seconds.
          </p>
        ) : (
          <Button asChild>
            <Link to={`/join/${code}`}>
              Join this room <ArrowRight size={16} />
            </Link>
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => {
            void session.leave();
            navigate("/");
          }}
        >
          Back to home
        </Button>
      </main>
    );
  return (
    <main className="room-page">
      <div className="room-topline">
        <span className="eyebrow">
          <span
            className={
              game.status === "connected" ? "online-dot" : "offline-dot"
            }
          />
          {game.status === "connected"
            ? "YOUR PEOPLE, CONNECTED"
            : game.status.toUpperCase()}
        </span>
        <Button variant="ghost" onClick={() => setConfirmLeave(true)}>
          <LogOut size={15} /> Leave room
        </Button>
      </div>
      {game.error && (
        <div className="error-banner" role="alert">
          <Wifi size={18} />
          <span>{game.error}</span>
          <button
            aria-label="Dismiss error"
            onClick={() => session.clearError()}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {game.state.phase === "lobby" ? (
        <Lobby />
      ) : game.state.phase === "voting" ? (
        <Voting />
      ) : game.state.phase === "results" ? (
        <Results />
      ) : (
        <Summary />
      )}
      <details className="connection-details">
        <summary>Connection details</summary>
        <p>
          {game.metrics.connections} active WebRTC connections · Connected in{" "}
          {(game.metrics.connectMs / 1000).toFixed(1)}s · Round trip{" "}
          {game.metrics.latency}ms · {game.metrics.disconnects} disconnects
        </p>
        <p>
          Admission success: {game.metrics.admissions} /{" "}
          {game.metrics.joinAttempts} attempts
          {game.metrics.joinAttempts
            ? ` (${Math.round((game.metrics.admissions / game.metrics.joinAttempts) * 100)}%)`
            : ""}{" "}
          · Last event {Math.round(game.metrics.eventMs)}ms · Peak{" "}
          {game.metrics.peakConnections} direct connections · Heap{" "}
          {game.metrics.memoryMB === null
            ? "not reported by this browser"
            : `${game.metrics.memoryMB.toFixed(1)} MB (approx.)`}
        </p>
        <p>
          2–12 players: primary target, 13–30: experimental, 31–60: advanced and
          unverified. Keep the host tab open. Public relays and some networks
          may need TURN.
        </p>
      </details>
      {confirmLeave && (
        <Modal
          title={game.isHost ? "End this room?" : "Leave your friends?"}
          close={() => setConfirmLeave(false)}
        >
          <p>
            {game.isHost
              ? "You are the host. Leaving will end the game for everyone."
              : "You can return with your room link while the host keeps the room open."}
          </p>
          <div className="row">
            <Button
              onClick={async () => {
                await session.leave();
                navigate("/");
              }}
            >
              Leave room
            </Button>
            <Button variant="outline" onClick={() => setConfirmLeave(false)}>
              Keep playing
            </Button>
          </div>
        </Modal>
      )}
    </main>
  );
}

export function Lobby() {
  const { state: s, isHost, id } = useGame();
  const [custom, setCustom] = useState("");
  const [save, setSave] = useState(false);
  if (!s) return null;
  const online = s.players.filter((p) => p.online).length;
  const countQuestions = (category: Settings["category"]) =>
    [...questions, ...s!.custom].filter(
      (q) => category === "all" || q.category === category,
    ).length;
  const available = countQuestions(s.settings.category);
  function setting<K extends keyof Settings>(key: K, value: Settings[K]) {
    const next = { ...s!.settings, [key]: value };
    next.rounds = Math.min(
      next.rounds,
      Math.max(1, countQuestions(next.category)),
    );
    session.settings(next);
  }
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">THE GOOD TIMES START HERE</div>
        <h1>
          A room for your people<span>.</span>
        </h1>
        <p>
          {isHost
            ? "Send the invitation. Let your friends bring the personality."
            : "You’re in. Make yourself at home."}
        </p>
      </div>
      <div className="lobby-grid">
        <section className="panel">
          <ShareRoom code={s.code} />
          <div className="section-title">
            <h2>
              Your circle{" "}
              <span>
                {online} / {s.settings.capacity}
              </span>
            </h2>
            <span className="live-tag">
              <span className="online-dot" /> Live
            </span>
          </div>
          <div className="players-grid">
            {s.players.map((p, i) => (
              <div className="player-card" key={p.id}>
                <Avatar player={p} index={i} />
                <div>
                  <b>
                    {p.name}
                    {p.id === id ? " (you)" : ""}
                  </b>
                  <span>
                    {p.host ? (
                      <>
                        <Crown size={11} /> The host
                      </>
                    ) : p.online ? (
                      "Ready for the revelations"
                    ) : (
                      "Reconnecting…"
                    )}
                  </span>
                </div>
                {isHost && !p.host && (
                  <button
                    className="kick"
                    title={`Remove ${p.name}`}
                    onClick={() => session.kick(p.id)}
                  >
                    <X size={14} />
                  </button>
                )}
                <span className={p.online ? "online-dot" : "offline-dot"} />
              </div>
            ))}
          </div>
          {online < 2 && (
            <div className="empty-friends">
              <Users size={25} />
              <b>Good company is on its way.</b>
              <p>Share your invitation to get a friend in here.</p>
            </div>
          )}
          <p className="fine">
            <ShieldCheck size={14} /> Private room. Real friends. No spectators
            added.
          </p>
        </section>
        <aside className="panel settings-panel">
          <div className="row">
            <Settings2 size={19} />
            <h2>Make it your game</h2>
          </div>
          <label>
            Questions
            <select
              disabled={!isHost}
              value={s.settings.rounds}
              onChange={(e) => setting("rounds", +e.target.value)}
            >
              {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n} disabled={n > available}>
                  {n} {n === 1 ? "question" : "questions"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Time to decide
            <select
              disabled={!isHost}
              value={s.settings.duration}
              onChange={(e) =>
                setting("duration", +e.target.value as Settings["duration"])
              }
            >
              {[15, 30, 45, 60, 90].map((n) => (
                <option key={n} value={n}>
                  {n} seconds
                </option>
              ))}
            </select>
          </label>
          <label>
            The vibe
            <select
              disabled={!isHost}
              value={s.settings.category}
              onChange={(e) =>
                setting("category", e.target.value as Settings["category"])
              }
            >
              {["all", ...categories].map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "A little of everything" : title(c)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Room capacity
            <select
              disabled={!isHost}
              value={s.settings.capacity}
              onChange={(e) => setting("capacity", +e.target.value)}
            >
              {[12, 30, 60].map((n) => (
                <option key={n} value={n}>
                  {n} players{n > 12 ? " · unverified capacity" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="toggle-label">
            <span>
              Vote for yourself<small>A little self-love is allowed.</small>
            </span>
            <input
              type="checkbox"
              disabled={!isHost}
              checked={s.settings.selfVote}
              onChange={(e) => setting("selfVote", e.target.checked)}
            />
          </label>
          {isHost ? (
            <Button
              className="full"
              disabled={online < 2 || available === 0}
              onClick={() => session.start()}
            >
              Let’s play <ArrowRight size={17} />
            </Button>
          ) : (
            <div className="waiting-label">
              <LoaderCircle className="spin" size={17} /> Waiting for the host
              to start...
            </div>
          )}
          <p className="fine center">
            {online < 2
              ? "At least 2 friends make a game."
              : available === 0
                ? "Add a custom question to get started."
                : "Everybody in? Let the voting begin."}
          </p>
        </aside>
      </div>
      {isHost && (
        <section className="panel custom-inline">
          <div>
            <div className="eyebrow">INSIDE JOKES WELCOME</div>
            <h2>Got a question only your group would get?</h2>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = {
                id: crypto.randomUUID(),
                category: "custom" as const,
                text: custom.trim(),
              };
              if (questionSchema.safeParse(q).success) {
                session.custom(q);
                if (save) {
                  const saved = readSavedQuestions();
                  localStorage.setItem(
                    "eleven-custom",
                    JSON.stringify([...saved, q].slice(-200)),
                  );
                }
                setCustom("");
              }
            }}
          >
            <label className="sr-only" htmlFor="custom-inline">
              Custom question
            </label>
            <div className="row">
              <input
                id="custom-inline"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                minLength={8}
                maxLength={240}
                placeholder="Who’s most likely to…"
                required
              />
              <Button type="submit" disabled={custom.trim().length < 8}>
                <Plus size={17} /> Add
              </Button>
            </div>
            <label className="check-label">
              <input
                type="checkbox"
                checked={save}
                onChange={(e) => setSave(e.target.checked)}
              />{" "}
              Save this question on my device
            </label>
          </form>
          {s.custom.length > 0 && (
            <p className="fine">
              {s.custom.length} custom{" "}
              {s.custom.length === 1 ? "question" : "questions"} in this room ·{" "}
              <Link to="/questions">Manage questions</Link>
            </p>
          )}
        </section>
      )}
    </>
  );
}

export function Voting() {
  const { state: s, id, ack, status, offset } = useGame();
  const [selected, setSelected] = useState(""),
    [search, setSearch] = useState(""),
    [pending, setPending] = useState(false),
    [now, setNow] = useState(Date.now());
  const round = s!.round!;
  useEffect(() => {
    setSelected("");
    setPending(false);
  }, [round.id]);
  useEffect(() => {
    if (ack) setPending(false);
  }, [ack]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.ceil((round.deadline - now - offset) / 1000));
  const eligibleVoter = round.eligible.some((p) => p.id === id);
  return (
    <section className="voting-page">
      <div className="round-top">
        <span className="round-pill">
          QUESTION {round.number} <span>/ {s!.settings.rounds}</span>
        </span>
        <span className="category-pill">
          <Sparkles size={14} />
          {title(round.question.category)}
        </span>
      </div>
      <div
        className={`countdown ${left <= 5 ? "urgent" : ""}`}
        role="timer"
        aria-label={`${left} seconds remaining`}
        style={
          {
            "--progress": `${(left / s!.settings.duration) * 100}%`,
          } as React.CSSProperties
        }
      >
        <span>
          {left}
          <small>SECONDS</small>
        </span>
      </div>
      <div className="eyebrow">BE HONEST. WE CAN TAKE IT.</div>
      <h1 key={round.id}>{round.question.text}</h1>
      <p className="vote-subtitle" role="status">
        {ack
          ? "Your vote has been submitted! Waiting for everyone..."
          : left === 0
            ? "Time’s up. Waiting for the host to reveal the results…"
            : "Someone came to mind. Go on, pick them."}
      </p>
      {round.eligible.length > 12 && (
        <label className="candidate-search">
          <Search size={18} />
          <input
            placeholder="Find a friend"
            aria-label="Find a friend"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      )}
      <div className="candidate-grid">
        {round.eligible
          .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
          .map((p, i) => {
            const disabled =
              ack ||
              pending ||
              left === 0 ||
              status !== "connected" ||
              !eligibleVoter ||
              (!s!.settings.selfVote && p.id === id);
            return (
              <motion.button
                whileTap={{ scale: 0.98 }}
                key={p.id}
                className={`candidate ${selected === p.id ? "selected" : ""}`}
                disabled={disabled}
                onClick={() => {
                  setSelected(p.id);
                  setPending(false);
                }}
                aria-pressed={selected === p.id}
              >
                <Avatar player={p} index={i} />
                <b>
                  {p.name}
                  {p.id === id ? " (you)" : ""}
                </b>
                <span className="selection-circle">
                  {selected === p.id && <Check size={15} />}
                </span>
              </motion.button>
            );
          })}
      </div>
      <div className="vote-controls">
        {ack ? (
          <div className="vote-success">
            <CheckCheck size={21} /> Your secret is safe with the ballot box.
          </div>
        ) : (
          <Button
            disabled={
              !selected ||
              left === 0 ||
              status !== "connected" ||
              !eligibleVoter
            }
            onClick={() => {
              setPending(true);
              session.vote(selected);
            }}
          >
            {pending ? (
              <>
                <LoaderCircle className="spin" size={17} /> Retry vote
                confirmation
              </>
            ) : (
              <>
                Submit Vote <ArrowRight size={17} />
              </>
            )}
          </Button>
        )}
        <p className="fine">
          <ShieldCheck size={13} /> Only the host’s browser receives individual
          ballots.
        </p>
        <div className="vote-progress">
          <div>
            <span
              style={{
                width: `${(round.voted / round.eligible.length) * 100}%`,
              }}
            />
          </div>
          <p>
            {round.voted} / {round.eligible.length} votes received
          </p>
        </div>
      </div>
    </section>
  );
}

export function Results() {
  const { state: s, isHost, status } = useGame();
  const [reveal, setReveal] = useState(false);
  const round = s!.round!;
  useEffect(() => {
    setReveal(false);
    const t = setTimeout(() => setReveal(true), 1200);
    return () => clearTimeout(t);
  }, [round.id]);
  const winners = round.results.filter((p) => p.rank === 1 && p.votes > 0);
  return (
    <section className="results-page">
      <span className="round-pill">
        THE RESULTS ARE IN · {round.number} / {s!.settings.rounds}
      </span>
      <div className="results-trophy">
        <Trophy size={34} />
        <span>✦</span>
      </div>
      <div className="eyebrow">
        {reveal ? "THE GROUP HAS SPOKEN" : "A LITTLE SUSPENSE…"}
      </div>
      <h1>{round.question.text}</h1>
      <AnimatePresence mode="wait">
        {!reveal ? (
          <motion.div className="suspense" key="suspense" exit={{ opacity: 0 }}>
            <LoaderCircle className="spin" /> Counting the revelations…
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rankings"
            key="rankings"
          >
            {winners.length > 0 ? (
              <p className="winner-announcement">
                {winners.map((p) => p.name).join(" & ")}{" "}
                {winners.length > 1 ? "share the crown" : "takes the crown"}{" "}
                <Crown size={17} />
              </p>
            ) : (
              <p className="winner-announcement">
                No ballots this round. A mysterious bunch.
              </p>
            )}
            {round.results.map((p, i) => (
              <motion.div
                className={`ranking ${p.rank === 1 && p.votes > 0 ? "winner" : ""}`}
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: Math.min((round.results.length - i - 1) * 0.12, 2),
                }}
              >
                <span className="rank-number">
                  {p.rank === 1 && p.votes > 0 ? (
                    <Crown size={18} />
                  ) : (
                    String(p.rank).padStart(2, "0")
                  )}
                </span>
                <Avatar player={p} index={i} />
                <div className="rank-main">
                  <div className="row between">
                    <b>{p.name}</b>
                    <span>
                      {p.votes} {p.votes === 1 ? "vote" : "votes"}
                    </span>
                  </div>
                  <div className="rank-track">
                    <motion.span
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(p.votes / Math.max(1, round.voted)) * 100}%`,
                      }}
                      transition={{
                        delay:
                          Math.min((round.results.length - i - 1) * 0.12, 2) +
                          0.2,
                        duration: 0.7,
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {reveal && (
        <div className="result-actions">
          {isHost ? (
            <Button
              disabled={status !== "connected"}
              onClick={() => session.start()}
            >
              {round.number >= s!.settings.rounds
                ? "See our story"
                : "Next Question"}{" "}
              <ArrowRight size={17} />
            </Button>
          ) : (
            <p className="waiting-label">
              <LoaderCircle className="spin" size={16} /> Waiting for the host
              to continue…
            </p>
          )}
          <p className="fine">
            {round.voted} honest votes. Zero explanations required.
          </p>
        </div>
      )}
    </section>
  );
}

export function Summary() {
  const { state: s, isHost } = useGame();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const history = s!.history;
  const total = history.reduce((n, r) => n + r.voted, 0);
  const wins = new Map<string, { name: string; count: number }>();
  history.forEach((r) =>
    r.results
      .filter((p) => p.rank === 1 && p.votes > 0)
      .forEach((p) =>
        wins.set(p.id, {
          name: p.name,
          count: (wins.get(p.id)?.count || 0) + 1,
        }),
      ),
  );
  const awards = [...wins.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
  async function share() {
    const text = `Our Eleven:11 night ✧\n${history.length} questions · ${s!.players.length} friends · ${total} votes\n${history
      .map(
        (r) =>
          `${r.question.text}\n${
            r.results
              .filter((p) => p.rank === 1 && p.votes > 0)
              .map((p) => p.name)
              .join(" & ") || "No votes"
          }`,
      )
      .join("\n\n")}\nPlay at ${location.origin}`;
    try {
      if (navigator.share)
        await navigator.share({ title: "Our Eleven:11 night", text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }
    } catch {
      setCopied(false);
    }
  }
  function download() {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#F5F0E8";
    c.fillRect(0, 0, 1080, 1350);
    c.fillStyle = "#49356F";
    c.font = "bold 64px sans-serif";
    c.fillText("Eleven:11", 80, 130);
    c.font = "bold 70px sans-serif";
    c.fillText("A night to remember.", 80, 300);
    c.font = "32px sans-serif";
    c.fillText(
      `${history.length} questions · ${s!.players.length} friends · ${total} votes`,
      80,
      380,
    );
    c.font = "bold 38px sans-serif";
    c.fillText("The group’s headline makers", 80, 510);
    awards.slice(0, 8).forEach((p, i) => {
      c.font = "32px sans-serif";
      c.fillText(
        `${i + 1}. ${p.name} · ${p.count} ${p.count === 1 ? "crown" : "crowns"}`,
        80,
        600 + i * 65,
      );
    });
    c.font = "27px sans-serif";
    c.fillText("Your friends. Your votes. Your secrets.", 80, 1230);
    const a = document.createElement("a");
    a.download = "our-eleven11-night.png";
    a.href = canvas.toDataURL();
    a.click();
  }
  return (
    <section className="summary-page">
      <div className="eyebrow">SAME FRIENDS. NEW STORIES.</div>
      <h1>
        Well, that was revealing<span>.</span>
      </h1>
      <p>A few secrets out. A few memories in.</p>
      <div className="summary-stats">
        <div>
          <b>{history.length}</b>
          <span>questions played</span>
        </div>
        <div>
          <b>{s!.players.length}</b>
          <span>favorite people</span>
        </div>
        <div>
          <b>{total}</b>
          <span>honest votes</span>
        </div>
      </div>
      <div className="panel group-awards">
        <Trophy size={28} />
        <h2>The headline makers</h2>
        {awards.length ? (
          awards.map((p, i) => (
            <div className="award" key={p.name + i}>
              <span>{i === 0 ? "👑" : "✨"}</span>
              <b>{p.name}</b>
              <span>
                {p.count} {p.count === 1 ? "crown" : "crowns"} ·{" "}
                {i === 0 ? "Main character energy" : "Unforgettable impression"}
              </span>
            </div>
          ))
        ) : (
          <p>A group of mystery. No votes cast this time.</p>
        )}
      </div>
      <div className="session-history">
        <h2>For the group chat archives</h2>
        {history.map((r) => (
          <div key={r.id}>
            <span>{String(r.number).padStart(2, "0")}</span>
            <p>
              {r.question.text}
              <b>
                {r.results
                  .filter((p) => p.rank === 1 && p.votes > 0)
                  .map((p) => p.name)
                  .join(" & ") || "No votes"}
              </b>
            </p>
          </div>
        ))}
      </div>
      <div className="summary-actions">
        <Button onClick={share}>
          <Share2 size={16} />
          {copied ? "Summary copied" : "Share our story"}
        </Button>
        <Button variant="outline" onClick={download}>
          Download summary card
        </Button>
        {isHost && (
          <Button variant="outline" onClick={() => session.reset()}>
            Play Again
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={async () => {
            await session.leave();
            navigate("/");
          }}
        >
          New Room <ArrowRight size={15} />
        </Button>
        <Link className="text-link" to="/">
          Back to Home
        </Link>
      </div>
    </section>
  );
}
