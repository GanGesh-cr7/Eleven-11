import { useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Heart,
  Menu,
  Settings2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { Modal } from "./shared";
import { sfx, soundStore } from "../lib/sound";
import { loadQuestions } from "../lazy";

function SoundToggle() {
  const on = useSyncExternalStore(soundStore.subscribe, soundStore.enabled);
  return (
    <Button
      variant="ghost"
      className="sound-toggle"
      aria-label={on ? "Mute sound effects" : "Turn on sound effects"}
      aria-pressed={on}
      title={on ? "Sound on" : "Sound off"}
      onClick={() => {
        soundStore.setEnabled(!on);
        if (!on) sfx.select();
      }}
    >
      {on ? <Volume2 size={19} /> : <VolumeX size={19} />}
    </Button>
  );
}
export function HowTo({ close }: { close: () => void }) {
  return (
    <Modal title="Good friends. Great revelations." close={close}>
      <p>One question. Everyone votes. Let the group decide.</p>
      <ol className="how-steps">
        <li>
          <b>Bring your people</b>
          <span>
            Create a private room and send the invitation link. You need at
            least two players.
          </span>
        </li>
        <li>
          <b>Go with your gut</b>
          <span>
            Pick the friend who fits the question and submit before time runs
            out.
          </span>
        </li>
        <li>
          <b>Let the votes talk</b>
          <span>
            Watch the rankings reveal, laugh together, and play another round.
          </span>
        </li>
      </ol>
      <p className="fine">
        Votes are hidden from other players. The host’s browser processes
        ballots. Keep the host tab open throughout the game.
      </p>
      <Button className="full" onClick={close}>
        Got it. Let’s play <ArrowRight size={17} />
      </Button>
    </Modal>
  );
}

export function ConnectionSettings({ close }: { close: () => void }) {
  const [url, setUrl] = useState(""),
    [name, setName] = useState(""),
    [pass, setPass] = useState(""),
    [saved, setSaved] = useState(false);
  return (
    <Modal title="Connection settings" close={close}>
      <p>
        Most home networks connect directly. If your network needs TURN, enter
        credentials from your provider before joining a room.
      </p>
      <label>
        TURN URL
        <input
          placeholder="turns:your-provider.example:5349"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>
      <label>
        Username
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Credential
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />
      </label>
      <p className="fine">
        Saved only for this tab. Credentials are shared with your configured
        TURN provider. Never use a permanent private server key.
      </p>
      <div className="row">
        <Button
          disabled={!/^turns?:\S+$/.test(url) || !name || !pass}
          onClick={() => {
            sessionStorage.setItem(
              "eleven-turn",
              JSON.stringify([{ urls: url, username: name, credential: pass }]),
            );
            setSaved(true);
          }}
        >
          {saved ? (
            <>
              <Check size={16} /> Saved for this tab
            </>
          ) : (
            "Save connection settings"
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            sessionStorage.removeItem("eleven-turn");
            setUrl("");
            setName("");
            setPass("");
            setSaved(false);
          }}
        >
          Clear
        </Button>
      </div>
    </Modal>
  );
}

export function Header() {
  const [help, setHelp] = useState(false),
    [settings, setSettings] = useState(false),
    [menu, setMenu] = useState(false);
  return (
    <>
      <header className="site-header">
        <Link to="/" className="brand" aria-label="Eleven:11 home">
          <img src="/Logo.png" alt="" />
          <span>
            Eleven<span className="brand-colon">:11</span>
            <small>A LITTLE HONESTY. A LOT OF LAUGHTER.</small>
          </span>
        </Link>
        <nav aria-label="Main navigation" className={menu ? "open" : ""}>
          <button
            onClick={() => {
              setHelp(true);
              setMenu(false);
            }}
          >
            How to play
          </button>
          <Link
            to="/questions"
            onClick={() => setMenu(false)}
            onPointerEnter={() => void loadQuestions()}
            onFocus={() => void loadQuestions()}
          >
            The questions <ArrowUpRight size={14} />
          </Link>
          <button
            className="nav-icon"
            aria-label="Connection settings"
            onClick={() => setSettings(true)}
          >
            <Settings2 size={19} />
          </button>
          <span className="nav-note">
            <span className="online-dot" /> Made for your people
          </span>
        </nav>
        <div className="header-actions">
          <SoundToggle />
          <Button
            variant="ghost"
            className="mobile-menu"
            aria-label="Toggle menu"
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </Button>
        </div>
      </header>
      {help && <HowTo close={() => setHelp(false)} />}
      {settings && <ConnectionSettings close={() => setSettings(false)} />}
    </>
  );
}

export function Footer() {
  return (
    <footer>
      <div className="row">
        <span className="mini-spark">✧</span>
        <span>
          Good company. A little curiosity. <b>Eleven:11.</b>
        </span>
      </div>
      <div className="row">
        <Link to="/privacy">Privacy & the fine print</Link>
        <span className="footer-dot">•</span>
        <span>
          Made for real connections <Heart size={12} />
        </span>
      </div>
    </footer>
  );
}
