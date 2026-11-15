# Eleven:11

Your friends. Your votes. Your secrets.

A static React/TypeScript party game with real Trystero 0.27 Nostr discovery and WebRTC DataChannels. No game server, database, registration, analytics, or simulated participants. The supplied `assets/Logo.png` and `assets/favicon.png` are used for branding and installation icons.

## Run locally

Use Node.js 22.12+ (Node 22.23.5 was used here).

```sh
npm ci
npm run dev
```

Open the printed localhost URL. Create a room in one browser, copy the invite, and open it in a separate browser profile or incognito session. Enter another nickname, wait for host acknowledgement, then start the game. Two to twelve players are the initial target; see `TESTING.md` for what was actually verified.

```sh
npm test
node node_modules/@playwright/test/cli.js install chromium firefox
npm run test:e2e
npm run build
npm run preview
```

`npm run build` type-checks the application and produces `dist/`. Only those static files need hosting. No Node process is required after deployment. Scripts invoke the tools through Node explicitly because the existing `Eleven:11` directory contains a colon, which breaks npm's usual PATH executable lookup on Linux. Vite 8 also rejects colons in served file paths: the config disables its strict file guard only for such a working directory and binds development to loopback. Rename the checkout to `Eleven11` to retain Vite's default file guard. Do not expose the development server publicly. Use an HTTPS deployment for phones and remote friends; a plain LAN IP is not a secure context for Web Crypto.

## Playing

- Enter a trimmed nickname of 1–20 characters. Create a room, or join using its code or `/join/:code` invitation.
- The host shares an invitation, chooses 1–30 questions (bounded by the selected category’s available questions), a 15/30/45/60/90-second timer, category, self-voting policy, and capacity. At least two connected players are required.
- Every round freezes its eligible players and has one host-issued deadline. A player selects a candidate and submits one ballot. Submission is confirmed by the host; local UI state is never treated as proof of receipt.
- Identical submission retries are idempotent; a changed second choice, invalid voter/candidate, incorrect round, disallowed self-vote, and late ballot are rejected.
- Results include zero-vote players and competition ranks for ties (1, 1, 3). No sole winner is fabricated. All eligible votes can close a round early.
- The host advances rounds. The final summary includes official question results, group awards derived from actual crowns, total votes, sharing, a downloadable PNG card, and play again.
- The host can add custom questions in the lobby or on `/questions` while a session is active. Saving on the device is opt-in. Saved questions are loaded into newly created host rooms. Questions do not repeat within a game. The lobby caps round counts to the chosen question pool; add custom questions to expand it.

All requested routes exist: `/`, `/join/:code`, `/room/:code`, `/game/:code`, `/results/:code`, `/summary/:code`, `/questions`, `/privacy`, and a custom 404. Protected game routes restore the tab's membership or ask the visitor to join; a URL alone never creates fake admission.

## Networking and authority

`src/network/session.ts` owns networking outside React rendering. `protocol.ts` validates versioned envelopes and per-event payloads with Zod. Each envelope includes room, event ID, sender, round, and timestamp. Received event IDs are bounded/deduplicated, payload sizes are limited, and each connected peer has a message-rate budget.

1. A host creates a fresh P-256 signing key. Its public-key SHA-256 fingerprint supplies a 20-character uppercase hexadecimal room code (80 bits). A longer code is intentional: a six-character code is too guessable for private public-relay discovery without an authoritative directory.
2. Guests enter a discovery room and send a fresh nonce. The host signs that nonce and a random 256-bit private channel identifier. Guests verify both the fingerprint and signature before using the introduction. Public relays do not reserve codes or guarantee global uniqueness; this is not an audited cryptographic protocol.
3. Each guest moves to its own private Trystero room with the host, then leaves discovery. This avoids a persistent participant mesh. Simultaneous newcomers can briefly discover each other before leaving; targeted messages alone are not the topology mechanism.
4. The host issues an unguessable membership/resume token and binds the member to the authenticated DataChannel peer and private channel. Admission is independently signed and verified again on the private link before the guest pins the host peer. A copied nickname is not an identity. The normal client rejects an active duplicated tab instead of giving it another ballot.
5. Guests send ballots only through their host link. The host publishes vote totals, never voter-to-candidate mappings. State snapshots contain membership, questions, deadlines, aggregate results, and a personalized acknowledgement flag.
6. State transitions and membership changes send official snapshots. Vote progress uses compact count messages. Recovery snapshots are sent every 15 seconds; targeted ping responses every two seconds estimate host clock offset using the RTT midpoint. The host alone closes rounds. A delayed/backgrounded host may close late, but it still rejects ballots received after its deadline.
7. A guest refresh restores the host-issued token and private channel from tab sessionStorage, re-admits through the host, and receives the official state including acknowledged submission. Unexpected host loss pauses guest controls, shows reconnection status, and reports failure after a 30-second grace period. The underlying library continues discovery attempts, so a live host recovering later may restore the session.

The protocol uses `JOIN_REQUEST`, signed `HELLO`, `ADMIT`, `JOIN_ACCEPTED/REJECTED`, `STATE_SNAPSHOT/REQUEST`, `VOTE_SUBMIT/ACK/PROGRESS`, `PING`, `HOST_HEARTBEAT`, `ACTION_ERROR`, and `LEAVE`. Round and phase transitions are included in sequenced official snapshots rather than redundant separate transition events.

## Reliability, privacy, and limits

- Keep the **original host tab open and awake**. Its memory is authoritative. Host refresh/closure ends the game; there is no host migration or durable host recovery. The UI explains this rather than reconstructing invented state.
- Votes are anonymous in the regular participant interface, **not secret from the host browser**. A technically capable host can inspect ballots or modify the application. WebRTC transport encryption does not make the host trustworthy. Stronger guarantees require a trusted backend or a properly designed cryptographic voting protocol.
- Names/preferences use localStorage; custom-question persistence is opt-in. Membership tokens and optional TURN credentials use tab sessionStorage. Active state is in memory. Ballot maps clear when a round closes and when a room is left. Aggregate session history remains until the session is cleared.
- Public Nostr relays, STUN, and optional TURN are external infrastructure. Availability and connectivity are not guaranteed. Relays/STUN/TURN may see IP addresses and connection metadata. Direct WebRTC peers may learn each other's IP addresses; the static hosting provider can also log requests, including invitation paths. No third-party analytics or remote font requests are added.
- 2–12 is the primary product target, 13–30 experimental, and 31–60 advanced/unverified. The default is 12; settings allow 30 and 60 with clear labels. This is **not a claim that 12, 30, or 60 simultaneous users were load validated**. Refer to the measured browser scenarios in `TESTING.md`.
- Connection details show actual direct WebRTC connection count and peak, guest establishment time, admission success/attempt ratio, ping RTT, clock-adjusted last event latency, disconnects, and approximate JavaScript heap when the browser exposes it. These are local diagnostics, not analytics. Browser memory APIs are not portable. Host-side attempts count discovered introductions; guest-side attempts include joins that never reach a host. Use browser devtools for rigorous memory/load profiling.
- Mobile background suspension, network switching, NAT/firewalls, and browser connection limits can interrupt a room. Disconnected members retain their place for recovery; hosts can remove them. A frozen eligible list may include someone who disconnects mid-round, so the round waits for its deadline.
- A malicious participant with an invitation can request admission or abuse discovery. Application-level validation/rate limits do not provide a hardened anti-DoS service. Host verification and peer binding improve the normal protocol; they are not a formal security audit.

## Optional TURN and relay configuration

Trystero's current Nostr strategy is used by default. STUN endpoints are `stun:stun.cloudflare.com:3478` and `stun:stun.l.google.com:19302`. Public relay failures are expected to be possible. To choose compatible Nostr relays at build time:

```env
VITE_NOSTR_RELAYS=wss://your-first-relay.example,wss://your-second-relay.example
```

All players must use the same app release and overlapping relay choices. `VITE_` values are public frontend configuration, never secrets.

For restricted networks, open **Connection settings** in the header (inside the menu on mobile) before creating/joining. Supply your provider's `turn:` or `turns:` endpoint, username, and credential. Each browser requiring relay support should configure its own appropriate credentials. They remain in that tab's sessionStorage. This project does not provision TURN, promise cross-network connectivity, embed permanent TURN keys, or add a credential backend. Bring provider-issued temporary credentials. A future short-lived credential service is separate infrastructure and should be explicitly approved if desired.

## Static deployment

### Cloudflare Pages

1. Import the repository into Pages, select no framework preset or Vite, and use Node 22.
2. Build command: `npm run build`.
3. Build output directory: `dist`.
4. Leave Functions/API routes empty. Pages' SPA fallback serves the entry point for direct routes; `public/_redirects` is also copied to the output.
5. Test an HTTPS `/join/:code` link and guest refresh after deployment. Installability requires HTTPS (localhost is exempt).

### Netlify

`netlify.toml` supplies the build command, Node version, output directory, and SPA rewrite. Connect the repository and deploy. The output also includes security headers in `_headers` and the history fallback in `_redirects`.

The generated manifest and service worker cache the application shell, icons, and locally bundled fonts. An installed/offline shell does **not** make multiplayer work without network access. Wait until a game ends before refreshing to update the host application. Actual Android/iOS installation and different-provider phone connectivity require physical-device verification.

## Project map

- `src/pages/` — home, live lobby/game/results/summary, question editor, privacy, 404.
- `src/components/` — accessible modal, app shell, avatars, and shadcn-style Radix/CVA button primitive.
- `src/game/engine.ts` — pure host state machine, ballot validation, non-repeating selection, ranking.
- `src/game/types.ts` — shared types and runtime schemas.
- `src/data/questions.ts` — 108 editable starter questions in six categories plus custom-question support.
- `src/network/` — Trystero lifecycle, signed discovery, membership, private links, recovery, protocol validation.
- `tests/engine.test.ts` — deterministic game/protocol tests.
- `tests/e2e/` — Chromium/Firefox UI and real public-relay WebRTC scenarios, not mocked connections.
- `TESTING.md` — verification results and the physical-device/load checklist.

The Trystero API was checked against the current official documentation: [actions](https://trystero.dev/docs/actions/), [connections](https://trystero.dev/docs/connections/), and [signaling](https://trystero.dev/docs/signaling-strategies/). The implementation uses the 0.27 object action API and callback contexts rather than older tuple APIs.
