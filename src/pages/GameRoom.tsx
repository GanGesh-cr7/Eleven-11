import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
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
import { Avatar, Modal, title } from "../components/shared";
import { useGame } from "../network/useGame";
import { session } from "../network/session";
import { categories, type Settings } from "../game/types";
import {
  addedMessage,
  parseQuestionList,
  questions,
  saveQuestions,
  toCustomQuestions,
} from "../data/questions";
import { sfx } from "../lib/sound";
import {
  Confetti,
  CountUp,
  Drumroll,
  RevealText,
  randomReaction,
} from "../components/fun";

const winnerQuips = [
  "Main character energy, confirmed.",
  "The group has receipts.",
  "Nobody is surprised. Nobody.",
  "Called it. Everyone called it.",
  "Democracy has spoken.",
  "This will be brought up again.",
];
const spring = { type: "spring", stiffness: 320, damping: 18 } as const;

/** Runs `fn(previous, next)` when `value` changes, but not on first render. */
function useOnChange<T>(value: T, fn: (prev: T, next: T) => void) {
  const prev = useRef(value);
  const latest = useRef(fn);
  latest.current = fn;
  useEffect(() => {
    if (Object.is(prev.current, value)) return;
    const before = prev.current;
    prev.current = value;
    latest.current(before, value);
  }, [value]);
}
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

/** Route entry for the lazily loaded game chunk; Motion only ships with it. */
export function RoomRoute() {
  return (
    <MotionConfig reducedMotion="user">
      <RoomShell />
    </MotionConfig>
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
  const [notice, setNotice] = useState("");
  useOnChange(s?.players.length ?? 0, (prev, next) =>
    next > prev ? sfx.join() : sfx.leave(),
  );
  if (!s) return null;
  const online = s.players.filter((p) => p.online).length;
  const countQuestions = (category: Settings["category"]) =>
    [...questions, ...s!.custom].filter(
      (q) => category === "all" || q.category === category,
    ).length;
  const available = countQuestions(s.settings.category);
  const parsed = parseQuestionList(
    custom,
    [...questions, ...s.custom].map((q) => q.text),
  );
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
            <AnimatePresence initial={false}>
              {s.players.map((p, i) => (
                <motion.div
                  className="player-card"
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.85, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={spring}
                >
                  <motion.span
                    className="wave"
                    aria-hidden="true"
                    initial={{ opacity: 0, rotate: 0 }}
                    animate={{
                      opacity: [0, 1, 1, 0],
                      rotate: [0, 22, -12, 22, 0],
                    }}
                    transition={{ duration: 1.6, delay: 0.2 }}
                  >
                    👋
                  </motion.span>
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
                </motion.div>
              ))}
            </AnimatePresence>
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
              className={`full ${online >= 2 && available > 0 ? "ready-pulse" : ""}`}
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
              // Rooms hold up to 200 custom questions.
              const room = toCustomQuestions(
                parsed.texts.slice(0, 200 - s.custom.length),
              );
              if (!room.length) return;
              for (const q of room) session.custom(q);
              if (save) saveQuestions(room);
              setCustom("");
              setNotice(
                addedMessage(
                  room.length,
                  parsed.skipped + parsed.texts.length - room.length,
                ),
              );
            }}
          >
            <label className="sr-only" htmlFor="custom-inline">
              Custom questions
            </label>
            <textarea
              id="custom-inline"
              rows={3}
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value);
                setNotice("");
              }}
              maxLength={20000}
              placeholder={
                "Who’s most likely to…?\nPaste a whole list. Each line or “?” becomes its own question."
              }
              required
            />
            <div className="row between custom-actions">
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={save}
                  onChange={(e) => setSave(e.target.checked)}
                />{" "}
                Save on my device
              </label>
              <Button type="submit" disabled={!parsed.texts.length}>
                <Plus size={17} /> Add
                {parsed.texts.length > 1 ? ` ${parsed.texts.length}` : ""}
              </Button>
            </div>
            {notice && (
              <p className="fine" role="status">
                {notice}
              </p>
            )}
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
    [reaction, setReaction] = useState({ id: "", emoji: "", key: 0 }),
    [now, setNow] = useState(Date.now());
  const round = s!.round!;
  useEffect(() => {
    setSelected("");
    setPending(false);
    setReaction({ id: "", emoji: "", key: 0 });
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
  const everyone = round.voted >= round.eligible.length;
  const controlsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(sfx.roundStart, 60);
    return () => clearTimeout(t);
  }, [round.id]);
  // Clink on each of the final five seconds, then a buzzer at zero.
  useOnChange(left, (prev, next) => {
    if (next >= 1 && next <= 5) sfx.tick(next);
    else if (next === 0 && prev > 0) sfx.timeUp();
  });
  useOnChange(ack, (prev, next) => {
    if (next && !prev) sfx.voted();
  });
  useOnChange(round.voted, (prev, next) => {
    if (next <= prev) return;
    if (next >= round.eligible.length) sfx.everyoneIn();
    else sfx.blip();
  });
  return (
    <section className="voting-page">
      <motion.div
        className="round-top"
        key={`top-${round.id}`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="round-pill">
          QUESTION {round.number} <span>/ {s!.settings.rounds}</span>
        </span>
        <span className="category-pill">
          <Sparkles size={14} />
          {title(round.question.category)}
        </span>
      </motion.div>
      <div
        className={`countdown ${left <= 5 && left > 0 ? "urgent" : ""}`}
        role="timer"
        aria-label={`${left} seconds remaining`}
        style={
          {
            "--progress": `${(left / s!.settings.duration) * 100}%`,
          } as React.CSSProperties
        }
      >
        <span>
          <motion.b
            key={left}
            initial={{ scale: left <= 5 ? 1.45 : 1.15, opacity: 0.75 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={spring}
          >
            {left}
          </motion.b>
          <small>{left === 0 ? "TIME’S UP" : "SECONDS"}</small>
        </span>
      </div>
      <div className="eyebrow">BE HONEST. WE CAN TAKE IT.</div>
      <h1 key={round.id}>
        <RevealText text={round.question.text} />
      </h1>
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
            const isSelected = selected === p.id;
            return (
              <motion.div
                key={p.id}
                className="candidate-slot"
                initial={{ opacity: 0, y: 16, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  ...spring,
                  delay: Math.min(0.25 + i * 0.05, 0.9),
                }}
              >
                <motion.button
                  className={`candidate ${isSelected ? "selected" : ""}`}
                  disabled={disabled}
                  animate={{ scale: isSelected ? 1.03 : 1 }}
                  whileHover={disabled ? undefined : { y: -3 }}
                  whileTap={disabled ? undefined : { scale: 0.96 }}
                  transition={spring}
                  onClick={() => {
                    sfx.select();
                    setSelected(p.id);
                    setPending(false);
                    setReaction((r) => ({
                      id: p.id,
                      emoji: randomReaction(),
                      key: r.key + 1,
                    }));
                  }}
                  aria-pressed={isSelected}
                >
                  <AnimatePresence>
                    {reaction.id === p.id && (
                      <motion.span
                        key={reaction.key}
                        className="vote-reaction"
                        aria-hidden="true"
                        initial={{ opacity: 0, y: 0, scale: 0.4 }}
                        animate={{
                          opacity: [0, 1, 1, 0],
                          y: -52,
                          scale: [0.4, 1.3, 1, 1],
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.1 }}
                      >
                        {reaction.emoji}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <Avatar player={p} index={i} />
                  <b>
                    {p.name}
                    {p.id === id ? " (you)" : ""}
                  </b>
                  <span className="selection-circle">
                    <AnimatePresence>
                      {isSelected && (
                        <motion.span
                          initial={{ scale: 0, rotate: -45 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0 }}
                          transition={spring}
                        >
                          <Check size={15} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                </motion.button>
              </motion.div>
            );
          })}
      </div>
      <div className="vote-controls" ref={controlsRef}>
        <AnimatePresence mode="wait" initial={false}>
          {ack ? (
            <motion.div
              key="sent"
              className="vote-success"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={spring}
            >
              <motion.span
                className="ballot-drop"
                aria-hidden="true"
                initial={{ y: -36, rotate: -25, opacity: 0 }}
                animate={{ y: 0, rotate: 0, opacity: 1 }}
                transition={{ ...spring, delay: 0.1 }}
              >
                📨
              </motion.span>
              <CheckCheck size={21} /> Your secret is safe with the ballot box.
            </motion.div>
          ) : (
            <motion.div
              key="submit"
              className="vote-submit-bar"
              exit={{ opacity: 0, y: 10 }}
            >
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
            </motion.div>
          )}
        </AnimatePresence>
        {ack && <Confetti count={22} anchor={controlsRef} />}
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
          <AnimatePresence>
            {round.voted > 0 && (
              <motion.span
                key={round.voted}
                className="plus-one"
                aria-hidden="true"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: [0, 1, 0], y: -20 }}
                transition={{ duration: 1 }}
              >
                +1
              </motion.span>
            )}
          </AnimatePresence>
          <p>
            {round.voted} / {round.eligible.length} votes received
          </p>
          {everyone && (
            <motion.p
              className="everyone-in"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={spring}
            >
              Everyone’s in! 🎉 Get ready…
            </motion.p>
          )}
        </div>
      </div>
    </section>
  );
}

export function Results() {
  const { state: s, isHost, status } = useGame();
  const [reveal, setReveal] = useState(false);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const round = s!.round!;
  useEffect(() => {
    setReveal(false);
    const t = setTimeout(() => setReveal(true), 2400);
    return () => clearTimeout(t);
  }, [round.id]);
  const winners = round.results.filter((p) => p.rank === 1 && p.votes > 0);
  const rowDelay = (i: number) =>
    Math.min((round.results.length - i - 1) * 0.14, 2);
  // The spotlight lands after the rankings have climbed up to first place.
  const spotlightDelay = rowDelay(0) + 0.45;
  useEffect(() => sfx.drumroll(2.3), [round.id]);
  useEffect(() => {
    if (!reveal) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (seconds: number, fn: () => void) =>
      timers.push(setTimeout(fn, seconds * 1000));
    // Rows appear from last place upwards; tick on each, at most a dozen.
    round.results.forEach((_, i) => {
      const step = round.results.length - 1 - i;
      if (step < 12) at(rowDelay(i), () => sfx.rowTick(step));
    });
    if (winners.length) {
      at(spotlightDelay, sfx.fanfare);
      at(spotlightDelay + 0.4, () => sfx.sparkle());
    } else at(spotlightDelay, sfx.sadTrombone);
    return () => timers.forEach(clearTimeout);
  }, [reveal]);
  const quip =
    winners.length > 1
      ? "Great minds. Shared spotlight."
      : winnerQuips[(round.number - 1) % winnerQuips.length];
  return (
    <section className="results-page">
      <span className="round-pill">
        THE RESULTS ARE IN · {round.number} / {s!.settings.rounds}
      </span>
      <motion.div
        className="results-trophy"
        animate={
          reveal
            ? { rotate: [0, -12, 12, 0], scale: [1, 1.2, 1] }
            : { rotate: [-6, 6, -6] }
        }
        transition={
          reveal
            ? { duration: 0.7, delay: spotlightDelay }
            : { repeat: Infinity, duration: 0.45 }
        }
      >
        <Trophy size={34} />
        <span>✦</span>
      </motion.div>
      <div className="eyebrow">
        {reveal ? "THE GROUP HAS SPOKEN" : "A LITTLE SUSPENSE…"}
      </div>
      <h1>{round.question.text}</h1>
      <AnimatePresence mode="wait">
        {!reveal ? (
          <motion.div
            className="suspense"
            key="suspense"
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Drumroll names={round.results.map((p) => p.name)} />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rankings"
            key="rankings"
          >
            {winners.length > 0 ? (
              <motion.div
                className="winner-spotlight"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...spring, delay: spotlightDelay }}
              >
                <div className="spotlight-avatars" ref={spotlightRef}>
                  <span className="rays" aria-hidden="true" />
                  {winners.slice(0, 4).map((p) => (
                    <div className="crowned" key={p.id}>
                      <motion.span
                        className="crown-drop"
                        aria-hidden="true"
                        initial={{ y: -70, opacity: 0, rotate: -35 }}
                        animate={{ y: 0, opacity: 1, rotate: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 11,
                          delay: spotlightDelay + 0.35,
                        }}
                      >
                        👑
                      </motion.span>
                      <Avatar
                        player={p}
                        index={round.results.findIndex((r) => r.id === p.id)}
                      />
                    </div>
                  ))}
                </div>
                <p className="winner-announcement">
                  {winners.map((p) => p.name).join(" & ")}{" "}
                  {winners.length > 1 ? "share the crown" : "takes the crown"}{" "}
                  <Crown size={17} />
                </p>
                <p className="winner-quip">{quip}</p>
              </motion.div>
            ) : (
              <div className="no-votes">
                <motion.span
                  aria-hidden="true"
                  animate={{ rotate: [-8, 8, -8], y: [0, -3, 0] }}
                  transition={{ repeat: Infinity, duration: 1.4 }}
                >
                  🦗
                </motion.span>
                <p className="winner-announcement">
                  No ballots this round. A mysterious bunch.
                </p>
              </div>
            )}
            {winners.length > 0 && (
              <Confetti delay={spotlightDelay + 0.3} anchor={spotlightRef} />
            )}
            {round.results.map((p, i) => (
              <motion.div
                className={`ranking ${p.rank === 1 && p.votes > 0 ? "winner" : ""}`}
                key={p.id}
                initial={{ opacity: 0, y: 14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ ...spring, delay: rowDelay(i) }}
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
                      <CountUp value={p.votes} delay={rowDelay(i) + 0.2} />{" "}
                      {p.votes === 1 ? "vote" : "votes"}
                    </span>
                  </div>
                  <div className="rank-track">
                    <motion.span
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(p.votes / Math.max(1, round.voted)) * 100}%`,
                      }}
                      transition={{
                        delay: rowDelay(i) + 0.2,
                        duration: 0.8,
                        ease: [0.22, 1.4, 0.36, 1],
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
        <motion.div
          className="result-actions"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(spotlightDelay, 1.2) }}
        >
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
        </motion.div>
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
  // Competition ranking so tied crown counts share the same medal.
  const awardRank = (count: number) =>
    1 + awards.filter((a) => a.count > count).length;
  const medal = (rank: number) =>
    rank === 1 ? "👑" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "✨";
  useEffect(() => {
    if (!awards.length) return;
    const t = setTimeout(sfx.celebrate, 400);
    return () => clearTimeout(t);
  }, []);
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
  async function download() {
    const pixel = '"Pixelify Sans Variable", sans-serif';
    // Make sure the pixel font is ready before drawing with it on the canvas.
    await Promise.all(
      [`700 64px ${pixel}`, `500 32px ${pixel}`].map((f) =>
        document.fonts.load(f).catch(() => undefined),
      ),
    );
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const c = canvas.getContext("2d")!;
    const ink = "#3B2C5C";
    c.fillStyle = "#FBF6EE";
    c.fillRect(0, 0, 1080, 1350);
    c.fillStyle = "#E6DCF3";
    for (let x = 18; x < 1080; x += 36)
      for (let y = 18; y < 1350; y += 36) c.fillRect(x, y, 4, 4);
    const box = (x: number, y: number, w: number, h: number, fill: string) => {
      c.fillStyle = ink;
      c.beginPath();
      c.roundRect(x + 10, y + 10, w, h, 28);
      c.fill();
      c.fillStyle = fill;
      c.strokeStyle = ink;
      c.lineWidth = 5;
      c.beginPath();
      c.roundRect(x, y, w, h, 28);
      c.fill();
      c.stroke();
    };
    box(60, 60, 950, 400, "#ECE3FB");
    c.fillStyle = "#8064C8";
    c.font = `700 64px ${pixel}`;
    c.fillText("Eleven:11", 110, 160);
    c.fillStyle = "#2B2240";
    c.font = `700 70px ${pixel}`;
    c.fillText("A night to remember.", 110, 300);
    c.font = `500 32px ${pixel}`;
    c.fillText(
      `${history.length} questions · ${s!.players.length} friends · ${total} votes`,
      110,
      380,
    );
    box(60, 510, 950, 640, "#FFFDF9");
    c.fillStyle = "#2B2240";
    c.font = `700 40px ${pixel}`;
    c.fillText("The group’s headline makers", 110, 590);
    c.font = `500 32px ${pixel}`;
    awards.slice(0, 8).forEach((p, i) => {
      c.fillText(
        `${i + 1}. ${p.name} · ${p.count} ${p.count === 1 ? "crown" : "crowns"}`,
        110,
        670 + i * 58,
      );
    });
    c.fillStyle = "#49356F";
    c.font = `500 30px ${pixel}`;
    c.fillText("Your friends. Your votes. Your secrets.", 80, 1250);
    const a = document.createElement("a");
    a.download = "our-eleven11-night.png";
    a.href = canvas.toDataURL();
    a.click();
  }
  return (
    <section className="summary-page">
      {awards.length > 0 && <Confetti count={60} delay={0.4} originY={30} />}
      <motion.div
        className="eyebrow"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        SAME FRIENDS. NEW STORIES.
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...spring, delay: 0.1 }}
      >
        Well, that was revealing<span>.</span>
      </motion.h1>
      <p>A few secrets out. A few memories in.</p>
      <div className="summary-stats">
        {[
          [history.length, "questions played"],
          [s!.players.length, "favorite people"],
          [total, "honest votes"],
        ].map(([value, label], i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.25 + i * 0.12 }}
          >
            <b>
              <CountUp value={value as number} delay={0.35 + i * 0.12} />
            </b>
            <span>{label}</span>
          </motion.div>
        ))}
      </div>
      <div className="panel group-awards">
        <motion.span
          className="awards-trophy"
          animate={{ rotate: [-6, 6, -6], y: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 2.4 }}
        >
          <Trophy size={28} />
        </motion.span>
        <h2>The headline makers</h2>
        {awards.length ? (
          awards.map((p, i) => {
            const rank = awardRank(p.count);
            return (
              <motion.div
                className={`award ${rank === 1 ? "top" : ""}`}
                key={p.name + i}
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...spring, delay: 0.7 + Math.min(i * 0.12, 1.2) }}
              >
                <motion.span
                  animate={
                    rank === 1 ? { y: [0, -4, 0], rotate: [-8, 8, -8] } : {}
                  }
                  transition={{ repeat: Infinity, duration: 1.8 }}
                >
                  {medal(rank)}
                </motion.span>
                <b>{p.name}</b>
                <span>
                  {p.count} {p.count === 1 ? "crown" : "crowns"} ·{" "}
                  {rank === 1
                    ? "Main character energy"
                    : "Unforgettable impression"}
                </span>
              </motion.div>
            );
          })
        ) : (
          <p>A group of mystery. No votes cast this time.</p>
        )}
      </div>
      <div className="session-history">
        <h2>For the group chat archives</h2>
        {history.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: Math.min(i * 0.05, 0.5) }}
          >
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
          </motion.div>
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
