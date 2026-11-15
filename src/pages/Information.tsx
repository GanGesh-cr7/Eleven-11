import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";
export function Privacy() {
  return (
    <main className="privacy-page">
      <div className="eyebrow">NO MYSTERY IN THE FINE PRINT</div>
      <h1>A little honesty about privacy.</h1>
      <p className="lead">
        Eleven:11 is a frontend-only, peer-to-peer party game. No accounts. No
        database. No remote analytics.
      </p>
      <section>
        <h2>Who can see a vote?</h2>
        <p>
          Individual choices are hidden from regular players. Ballots go
          directly to the host’s browser, which processes and counts them. A
          technically capable host can inspect those ballots or modify the game.
          This is not host-proof anonymity or manipulation-proof voting.
          Stronger guarantees require a trusted backend or a carefully designed
          cryptographic voting protocol.
        </p>
      </section>
      <section>
        <h2>What stays on your device?</h2>
        <p>
          Your nickname is remembered in localStorage. Custom questions are
          saved there only when you enable saving. Your room membership and
          reconnection credential live in this tab’s sessionStorage. Active game
          state and individual ballots stay in memory. Ballots are cleared after
          each round. No private ballots are stored permanently.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            localStorage.removeItem("eleven-name");
            localStorage.removeItem("eleven-custom");
            sessionStorage.removeItem("eleven-turn");
            alert("Saved nickname, questions, and TURN settings cleared.");
          }}
        >
          Clear saved preferences
        </Button>
      </section>
      <section>
        <h2>How does the connection work?</h2>
        <p>
          Trystero uses external public Nostr relays for discovery and STUN
          servers for connectivity. Those services can observe connection
          metadata, including your IP address. Your WebRTC traffic is encrypted
          between browsers. Direct peers may learn one another’s IP addresses.
          Restricted networks may require a TURN provider, which also observes
          traffic metadata.
        </p>
      </section>
      <section>
        <h2>Private rooms and host verification</h2>
        <p>
          The 20-character room code is an 80-bit fingerprint of the host’s
          public signing key. Guests verify a signed, fresh introduction before
          entering a private 256-bit host–guest channel. Public discovery does
          not reserve names or guarantee global uniqueness. Treat invitations as
          private: anyone with one can request admission. This limits guessing
          and host impersonation but is not an audited security protocol.
        </p>
      </section>
      <section>
        <h2>The host keeps the party going</h2>
        <p>
          The host’s browser is the source of truth for timers, membership, and
          results. Keep that tab open and awake. Guests try to reconnect and
          restore an acknowledged vote after a brief outage. Host refresh or
          closure loses active room state. There is no host migration.
          Background tabs and mobile suspension can delay timers and
          reconnection.
        </p>
      </section>
      <section>
        <h2>How many friends?</h2>
        <p>
          The primary target is 2–12 players. Settings allow 30 (experimental)
          or 60 (advanced), but these capacities have not been load validated.
          After introduction, each guest keeps one host connection. Concurrent
          guests may temporarily connect during discovery. Browser, device,
          relay, and host bandwidth limits still apply. See the project README
          and test report for the exact verification status.
        </p>
      </section>
      <Link className="text-link" to="/">
        Back to the good stuff <ArrowRight size={16} />
      </Link>
    </main>
  );
}

export function NotFound() {
  return (
    <main className="center-state">
      <span className="not-found">404</span>
      <h1>This friend took a wrong turn.</h1>
      <p>The room might be private, but this page just doesn’t exist.</p>
      <Button asChild>
        <Link to="/">
          Back to Home <ArrowRight size={16} />
        </Link>
      </Button>
    </main>
  );
}
