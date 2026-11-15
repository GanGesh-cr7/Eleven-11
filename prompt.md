# MASTER DEVELOPMENT PROMPT
## FRONTEND-ONLY REAL-TIME MULTIPLAYER FRIENDS VOTING GAME

### ROLE

You are a senior React developer, TypeScript engineer, peer-to-peer networking specialist, UI/UX designer, and multiplayer game architect.

Build a fully functional, professional, modern, mobile-first anonymous voting party game.

The application must allow friends in different cities, countries, and internet networks to join private game rooms using codes and shareable invitation links.

**CRITICAL ARCHITECTURE REQUIREMENT:**

I only want to deploy a static frontend website.

Do not build or deploy a dedicated backend server.

Do not use Supabase, Firebase, PostgreSQL, MongoDB, or a custom database.

Instead, implement real browser-to-browser communication through WebRTC using Trystero and existing public signaling relays.

Understand that WebRTC requires external signaling infrastructure and that some restricted networks need TURN services. Do not misrepresent the application as completely infrastructure-free.

The finished application must provide genuine multiplayer functionality. Never simulate remote players or fake successful connections.

---

# 1. GAME CONCEPT

Build a real-time multiplayer game inspired by "Who Is Most Likely To?"

Players enter their names, create or join private rooms, vote anonymously on friends for a randomly selected question, and see ranked results after the timer expires.

Core requirements:

- Minimum 2 players
- Target maximum 60 players per room
- No account registration
- No email or password
- No dedicated game backend
- No persistent database
- Real-time multiplayer
- Shareable room code
- Shareable invitation URL
- Players on different internet connections
- Anonymous voting interface
- Synchronized countdown timer
- Animated ranking results
- Multiple rounds
- Customizable questions
- Responsive and installable website

Implement clear capacity limitations based on actual WebRTC load testing. Do not claim reliable 60-player support without proving it.

---

# 2. TECH STACK

Frontend:

- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui
- Motion for React
- Lucide React
- React Router

Multiplayer:

- WebRTC DataChannels
- Trystero
- Public Nostr signaling relays
- WebRTC STUN configuration
- Optional TURN configuration for restrictive networks

Local storage:

- localStorage for nickname and preferences
- sessionStorage for tab-specific identity where appropriate
- Memory for active game state

Deployment:

- Cloudflare Pages or Netlify static hosting

Testing:

- Vitest
- Playwright
- Multi-browser testing

Do not add unnecessary backend services or database dependencies.

---

# 3. VISUAL DESIGN SYSTEM

Create a premium minimalist interface using the following palette:

- White: #FFFFFF
- Warm Beige: #F5F0E8
- Soft Lavender: #E9E0F8
- Purple: #8064C8
- Dark Purple: #49356F
- Text: #252238
- Muted Text: #817B8C

Use Plus Jakarta Sans or DM Sans.

Visual characteristics:

- Modern typography
- White and beige backgrounds
- Lavender cards
- Purple action buttons
- Rounded corners
- Subtle shadows
- Smooth micro-interactions
- Elegant transitions
- Responsive layouts
- Professional loading indicators
- Beautiful countdown timer
- Animated results
- Minimalist illustrations and icons
- Consistent spacing

Avoid excessive glassmorphism, oversized decorative gradients, and generic dashboard layouts.

Ensure excellent readability and usability on mobile.

---

# 4. HOMEPAGE

The homepage must contain:

Application name and logo.

Tagline:

"Your friends. Your votes. Your secrets."

Name input:

"What should we call you?"

Placeholder:

"Enter your name"

Buttons:

1. Create a Game
2. Join a Game

For Join Game, provide a room code input.

Example:

KUM482

Rules:

- Nickname required
- Maximum 20 characters
- Trim whitespace
- Validate all input
- Remember nickname locally
- No registration

When Create Game is clicked:

1. Generate a secure, random room identifier.
2. Generate a short room code.
3. Initialize a Trystero room.
4. Establish the player as host.
5. Show the waiting lobby.
6. Produce a shareable invitation URL.

When Join Game is clicked:

1. Validate the code.
2. Connect through Trystero.
3. Wait for an active host response.
4. Request room admission.
5. Verify the room is not full.
6. Join the lobby after host acknowledgement.
7. Display a genuine connection error if no host can be reached.

Never assume a room exists just because a correctly formatted code was entered.

---

# 5. INVITE LINKS AND ROOM CODES

Example deployed domain:

https://mostly.example

Example invitation:

https://mostly.example/join/KUM482

The domain is illustrative only, not a real deployed URL.

When the user opens an invitation link:

- Open the app.
- Detect the room code.
- Ask for a nickname if needed.
- Automatically initiate the join request.
- Show connecting status.
- Display the waiting lobby after successful admission.

Include:

- Copy Code button
- Copy Invite Link button
- Share button using navigator.share when supported
- Fallback sharing interface
- Optional QR code

Room identifiers must contain sufficient randomness to reduce guessing.

Use an internal high-entropy room identifier if a short human-readable code is insufficiently resistant to guessing.

Because no authoritative backend exists, prevent room hijacking and code collisions to the extent possible with stronger random identifiers and host verification.

Explain that public peer-discovery services do not guarantee global room-code uniqueness.

---

# 6. PEER-TO-PEER NETWORK ARCHITECTURE

Use Trystero for peer discovery and WebRTC DataChannels.

Start with the default Nostr signaling strategy.

Separate networking logic from the rest of the game.

Create reusable modules for:

- Peer connection
- Room discovery
- Room membership
- Message validation
- Game event handling
- State synchronization
- Reconnection
- Host coordination

### Important topology requirement

Do not build a full mesh of every player communicating with every other player unnecessarily.

Prefer a host-coordinated message topology when the library and browser connectivity allow it.

The host is responsible for:

- Room membership
- Current question
- Round transitions
- Countdown deadline
- Vote aggregation
- Official results
- State snapshots

All other participants communicate their game actions through the host.

Use targeted messages instead of broadcasting all events to all peers.

Test the actual number of underlying WebRTC connections. A library-level targeted message does not necessarily mean a connection to every other peer has been avoided.

### Network limitations

Document:

- Public relay availability limitations
- STUN connectivity limitations
- TURN requirements
- Browser connection limits
- Mobile backgrounding behavior
- Host disconnection limitations
- Scaling limitations

Do not promise 100% connectivity across all networks without TURN fallback.

---

# 7. WAITING LOBBY

Display:

- Room code
- Invitation link
- Copy button
- Share button
- Current participant count
- Participant names
- Host indicator
- Connection status
- Start Game button for host

Show:

"11 / 60 players"

Each participant card contains:

- Initial-based avatar
- Display name
- Status indicator

The host can choose:

- Number of questions
- Voting duration
- Question category
- Self-voting setting

Start Game is enabled only after at least two players have joined.

Regular participants see:

"Waiting for the host to start..."

When someone joins, update every player's lobby.

The room must never silently add fake participants.

---

# 8. GAMEPLAY SYSTEM

When the host starts the game:

1. Freeze the eligible participant list for the round.
2. Select a question.
3. Generate a unique round ID.
4. Set the authoritative round deadline.
5. Broadcast the round state.
6. Display the same question to every connected player.

Example question:

"Who is the funniest person in this group?"

Under the question, show the real names of the eligible participants.

Use responsive selectable cards.

Each player selects one candidate.

Show a clear selected state.

Provide a Submit Vote button.

After successful submission:

"Your vote has been submitted!"

"Waiting for everyone..."

Prevent multiple submissions in the normal UI.

---

# 9. ANONYMOUS VOTING DESIGN

Voting choices must not be broadcast to other regular participants.

A vote message should be delivered only to the coordinating host.

The host keeps a set of accepted voter identifiers for each round.

Reject:

- Duplicate votes
- Unknown participants
- Invalid candidates
- Wrong round IDs
- Late votes
- Unsupported self-votes

Never expose individual vote mappings in the shared room state.

Only broadcast the total number of people who have voted.

Example:

"8 / 11 votes received"

### Important security disclosure

Because this is a frontend-only peer-to-peer application, the host browser coordinates and counts votes.

The host's browser necessarily processes the individual ballots.

This means voting is anonymous in the normal participant interface but cannot be guaranteed secret from a technically capable host who inspects or modifies their own browser.

Do not falsely advertise host-proof anonymity or manipulation-proof voting.

Document this limitation clearly.

For stronger guarantees in the future, recommend a trusted backend or a properly designed cryptographic voting protocol.

---

# 10. SYNCHRONIZED COUNTDOWN

Default voting period: 30 seconds.

Available settings:

- 15 seconds
- 30 seconds
- 45 seconds
- 60 seconds
- 90 seconds

The host generates a common round deadline.

All participants synchronize based on that deadline with a clock-offset estimation mechanism where useful.

Do not let independent client countdowns determine official round closure.

When the host closes the round:

- Stop accepting votes.
- Calculate the results.
- Broadcast finalized results.
- Transition all participants to the results screen.

If all eligible players submit votes early, the host may close the round before the deadline.

Use a round state machine to avoid duplicate closures.

---

# 11. RESULTS AND RANKINGS

Display ranked results using animated horizontal bars.

Example:

Question: Who is the funniest?

1. Gangesh — 7 votes
2. Rijo — 5 votes
3. Vinod — 3 votes
4. Deepak — 2 votes
5. Praveen — 1 vote

The actual names and counts must come from the live room.

Ranking logic:

- Highest vote total first
- Lowest vote total last
- Show zero-vote candidates
- Support tied ranks
- Use a consistent secondary sort order
- Never fabricate a sole winner when candidates are tied

### Result animation

1. Show a brief suspense state.
2. Reveal the lowest-ranked participants.
3. Animate vote bars.
4. Reveal higher rankings gradually.
5. Celebrate the winner or tied winners.
6. Show a Next Question button.

All players must receive identical official results.

---

# 12. QUESTION SYSTEM

Create an editable question dataset inside the frontend project.

Use a TypeScript or JSON file.

Example:

```ts
export const questions = [
  {
    id: "q001",
    category: "funny",
    text: "Who is the funniest person in this group?"
  },
  {
    id: "q002",
    category: "friendship",
    text: "Who gives the best advice?"
  }
];
```

Include at least 100 original starter questions.

Categories:

- Funny
- Friendship
- Personality
- College
- Compliments
- Random
- Custom

The host can submit custom questions while the room is active.

Custom questions are shared with players through WebRTC.

Persist custom questions in the host browser's local storage only if the host enables saving them.

Do not use an external database.

Avoid repeating questions within the same session.

---

# 13. GAME STATE AND MESSAGE PROTOCOL

Define a typed message protocol.

Recommended events:

- HELLO
- JOIN_REQUEST
- JOIN_ACCEPTED
- JOIN_REJECTED
- PLAYER_LIST_UPDATE
- HOST_HEARTBEAT
- GAME_START
- ROUND_START
- VOTE_SUBMIT
- VOTE_ACK
- VOTE_PROGRESS
- ROUND_CLOSE
- RESULTS_REVEAL
- NEXT_ROUND
- STATE_REQUEST
- STATE_SNAPSHOT
- PLAYER_DISCONNECTED
- GAME_END

Every event should include:

- Protocol version
- Room identifier
- Event ID
- Sender identity
- Relevant round ID
- Payload
- Timestamp or sequence information

Validate all incoming messages.

Never trust a participant's self-declared host role.

Use host-issued membership identifiers and verify message senders against connected peers.

Add acknowledgements, duplicate message handling, and periodic state snapshots.

---

# 14. DISCONNECT AND RECONNECT

Handle:

- Refreshing the page
- Temporary internet loss
- Browser tab suspension
- Mobile network switching
- Accidental navigation
- Duplicate tabs
- Host leaving the room

### Reconnection

When a guest reconnects:

1. Restore their locally stored room session.
2. Reconnect to the same room.
3. Verify membership with the host.
4. Request a current state snapshot.
5. Restore the current question, deadline, and voting state.
6. Restore the submitted-vote indicator if acknowledged previously.

Never assume a locally saved vote submission guarantees host receipt.

### Host disconnection

For the initial implementation, make the host's continued connection a requirement.

If the host disappears:

- Show "Host disconnected."
- Attempt reconnection within a grace period.
- Pause progression while the host is unavailable.
- Allow participants to leave gracefully.
- Explain that the game might end if the host does not return.

Do not pretend that host migration is reliable without shared replicated state and explicit election and recovery logic.

Optional host migration may be implemented later after it is properly tested.

---

# 15. CAPACITY AND PERFORMANCE

Support the requested UI and room configuration for up to 60 players.

However, use a realistic staged rollout:

- 2–12 users: primary target
- 13–30 users: experimental target
- 31–60 users: advanced capacity target

Use efficient event payloads and host-targeted communication.

Do not continuously broadcast full participant lists or ballot details.

Track:

- Connection success rate
- Connection establishment time
- Number of active WebRTC connections
- Round event latency
- Disconnect frequency
- Browser memory usage

Never claim that 60 simultaneous connections have been validated unless actual testing confirms it.

Clearly document any limitations.

---

# 16. FINAL GAME SUMMARY

After the final question, display a beautiful session summary.

Include:

- Questions played
- Number of friends
- Total votes cast
- Question winners
- Fun group awards
- Shareable summary card

Show:

"Play Again"

"New Room"

"Back to Home"

Do not store private ballot details permanently.

---

# 17. ROUTES AND PAGES

Required routes:

- `/` — Homepage
- `/join/:code` — Invitation and join page
- `/room/:code` — Waiting lobby
- `/game/:code` — Gameplay
- `/results/:code` — Results
- `/summary/:code` — Final summary
- `/questions` — Question management
- `/privacy` — Privacy information
- `*` — Custom 404

Ensure direct navigation and refresh work correctly on static hosting.

Configure SPA history fallback or appropriate rewrites.

---

# 18. RESPONSIVE DESIGN

Support:

- Android phones
- iPhones
- Tablets
- Laptops
- Desktop browsers

Use responsive card grids and mobile-friendly controls.

For 60-player voting, the candidate grid must remain usable through scrolling and optional name search.

Ensure:

- No horizontal overflow
- Accessible text contrast
- Large touch targets
- Keyboard interaction
- Screen reader labels
- Reduced-motion support
- Correct focus handling
- Good performance on lower-end phones

---

# 19. SECURITY AND PRIVACY

Implement:

- Cryptographically secure room identifiers
- Input validation
- Message schema validation
- Host membership verification
- Local identity persistence
- Protection against duplicate normal-client voting
- Optional host-controlled kick functionality
- Safe rendering of custom questions
- No unnecessary data collection
- No remote analytics by default
- Room state cleanup
- Clear explanation of peer-to-peer limitations

P2P encryption protects transport but does not make a malicious host trustworthy.

Use accurate language when describing the privacy and security of the application.

---

# 20. TESTING

Build automated tests and manually verify multiplayer behavior.

Mandatory scenarios:

1. Create a room.
2. Copy its invitation link.
3. Join from a second browser.
4. Join from another phone using a different internet provider.
5. Verify both users appear in the lobby.
6. Start the game.
7. Verify everyone receives the same question.
8. Submit votes.
9. Verify vote progress updates.
10. Verify duplicate votes are rejected by the normal game logic.
11. Let the timer expire.
12. Verify identical results on each device.
13. Advance to the next round.
14. Refresh a guest tab.
15. Test reconnection.
16. Disconnect the host.
17. Test incorrect room codes.
18. Test full-room behavior.
19. Test multiple rooms simultaneously.
20. Test real 60-user load if resources are available.

When a test cannot be run, clearly report it as unverified.

Do not silently mark untested requirements as completed.

---

# 21. DEPLOYMENT

Generate a production-ready static site.

Expected build command:

`npm run build`

Expected output directory:

`dist`

Support Cloudflare Pages deployment.

Do not require Node.js to run continuously after the frontend is deployed.

Do not deploy a custom WebSocket server.

Do not introduce any server-side API routes.

External public signaling and STUN services may still be used as necessary for WebRTC.

Document optional TURN setup if direct connectivity fails on restricted networks.

---

# 22. DEVELOPMENT PHASES

**Phase 1 — Foundation**

Initialize React, Vite, TypeScript, Tailwind, routing, and the design system.

**Phase 2 — UI**

Implement homepage, lobby, voting page, countdown, results, and summary.

**Phase 3 — P2P Networking**

Integrate Trystero, room discovery, invitation links, peer connections, and membership messaging.

**Phase 4 — Game Engine**

Implement host-coordinated state, rounds, voting, timers, question selection, and results.

**Phase 5 — Reliability**

Add reconnection, message validation, acknowledgements, state snapshots, connection monitoring, and host-disconnect handling.

**Phase 6 — Quality**

Implement animations, accessibility, responsive behavior, tests, and performance optimizations.

**Phase 7 — Deployment**

Verify the production build and prepare static hosting configuration and documentation.

---

# 23. FINAL INSTRUCTIONS

Inspect the current repository before making changes.

Build this as a real project, not a design prototype.

Do not stop after generating a plan.

Do not generate fake multiplayer behavior.

Prioritize actual room connectivity and gameplay functionality over decorative features.

Use the latest stable package APIs and verify library documentation before implementing them.

Keep all code modular and well typed.

Start by implementing a minimal real connection between two browser sessions.

Once connectivity works, build the rest of the game.

The final result must be a fully deployable static React website with real peer-to-peer multiplayer voting, room codes, share links, synchronized rounds, and animated results.

Provide complete setup instructions, test results, deployment instructions, and an honest list of known limitations.

**BEGIN IMPLEMENTATION NOW.**
