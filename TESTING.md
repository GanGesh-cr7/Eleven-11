# Verification record

This is a real-browser verification record, not a certification of internet-wide connectivity or room capacity. Tests use actual public Nostr relays and browser WebRTC; no remote players, successful connections, or DataChannels are mocked.

## Commands

```sh
npm ci
npm test
node node_modules/@playwright/test/cli.js install chromium firefox
npm run test:e2e
npm run build
```

Playwright starts/reuses the Vite loopback server. The live network scenarios run in the Chromium project once; a separate scenario explicitly launches a Firefox guest for cross-engine networking. UI scenarios run in both projects. Network tests require outbound WebSocket access to public relays. A service outage can make them fail honestly. Screenshots and traces are written to ignored `test-results/` directories; traces should be treated as private because they can include membership tokens and room names.

## Last verified environment

- Linux, Node 22.23.5; packages pinned by package-lock.json.
- Playwright Chromium 159 and Firefox 159, headless, on the same machine/network.
- Real Nostr discovery and real WebRTC DataChannels, independent browser contexts.
- Public relay errors were observed during testing; relay redundancy still permitted the verified connections. This does not imply every relay or network will work.

## Automated scope

- Pure game engine: minimum players, frozen eligibility, common deadline, one accepted ballot per voter, identical retry idempotency, changed duplicate rejection, unknown voter/candidate, wrong round, self-vote policy, deadline/closed-round rejection, one-time closure, ballot cleanup, zero-vote rows, tied ranks, no repeated question, configured game end, custom category exhaustion, reset.
- Runtime/data boundaries: 108 unique starter questions, invalid message/schema rejection, invalid settings, stable host fingerprint generation.
- UI in Chromium and Firefox: home inputs, malformed room-code feedback, accessible help dialog/Escape, category/search library, custom-question editing, privacy page, direct-route refresh, 404.
- Responsive overflow checks: 320px, 390px, and 768px viewports on home, questions, and privacy.
- Live three-player flow: secure room creation; clipboard invitation; real host admission; membership propagation; measured settled host/guest direct-connection counts of 2/1/1; same round/question/deadline; host-acknowledged vote; compact vote progress; repeated/changed duplicate submissions not counted twice; guest refresh restoring membership and acknowledged ballot; host timer expiry; matching official results; non-repeating next round; early closure; final summary; replay; host loss shown honestly.
- Admission failure: host rejects a full two-slot test room without adding an extra member; a well-formed nonexistent code times out without invented membership.
- Duplicate tab: a copied tab session cannot admit a second active endpoint or steal the original guest’s connection.
- Cross-engine/isolation: Firefox guest and Chromium host exchange actual votes/results while another independent room stays in its own lobby.

See the final test-run counts below for the current execution result.

## Manual/device and load checklist — unverified

These require hardware, separate providers, relay credentials, or more participants that are not available in this workspace. They must not be marked completed based on same-machine automation.

- A phone on a different internet provider/country joining the deployed HTTPS site.
- Real Android Chrome and iOS Safari gameplay, app installation, sharing, and screen-reader interaction.
- A restrictive corporate/campus network requiring TURN; TURN provider credential expiry, relay-only mode, bandwidth quotas, and NAT behavior.
- Real mobile network switching, app backgrounding, OS suspension, and airplane-mode recovery.
- Sustained 12-player load, 30-player experimental load, and 60-player advanced load.
- Long-running sessions under hostile traffic, security/crypto review, browser memory pressure, and battery profiling.
- A public Cloudflare Pages or Netlify deployment. The production artifact and deployment configuration are prepared locally; no external deployment is claimed.

For a load test, record actual connection success/attempt ratio, time to admission, per-device connection count (including transient discovery), event latency/RTT, disconnects, and browser heap usage. Try concurrent rather than only sequential joins. Repeat on low-end phones and different networks. Keep the UI capacity labels experimental/unverified until evidence supports changing them.

## Final execution

Verified on 2026-11-14:

| Check | Observed result |
| --- | --- |
| `npm test` | **18 passed**, 1 test file |
| Full `npm run test:e2e` | **7 passed**, 3 deliberately skipped duplicate network-project entries; 2.1 minutes |
| UI rerun after focus/layout refinement | **4 passed** across Chromium and Firefox |
| `npm run build` | **Passed** TypeScript and Vite/PWA production generation; static output in `dist/` |
| `node tests/production-smoke.mjs` against `npm run preview -- --port 4173` | **Passed** real production WebRTC round and identical two-player tied results; host page with deployment CSP applied; manifest; registered service worker; direct-route refresh; offline cached shell |
| Targeted final admission/configuration rerun | **1 passed**: pool-bounded round counts, full-room rejection, nonexistent-code timeout |
| Prettier check of source and test/config files | **Passed** |
| `npm audit --omit=dev` | **0 production dependency advisories** in the installed dependency tree |

Three skipped entries are the network scenarios duplicated into the Firefox project by the test runner. They are intentionally run once in the Chromium project; the cross-engine scenario separately launches a real Firefox guest and verifies voting/results with Chromium. Firefox UI tests also run normally.

The final build has a single ~744 KB minified JavaScript chunk (~241 KB gzip), which triggers Vite's default 500 KB chunk-size advisory. This is a build advisory, not a failed build or measured performance guarantee. Full dependency audit also reports six build-tool advisories (two low and four moderate) through `vite-plugin-pwa`/Workbox's transitive glob, minimatch, and deepmerge dependencies. These tools are development dependencies and do not ship as a game backend. No forced downgrade or unverified transitive-major override was applied.

The production smoke script expects the built preview to already be running on port 4173. It uses independent browser contexts and the built assets, not the development diagnostics hook. The offline check verifies only the application shell: internet access is still required for multiplayer.

## Required scenario mapping

| Requirement scenario | Status |
| --- | --- |
| 1–3: Create, copy invitation, join second browser | Verified with real host acknowledgement |
| 4: Phone on a different ISP | **Unverified** |
| 5–9: Membership, start, same question, ballots, progress | Verified in actual DataChannels |
| 10: Duplicate ballots | Verified idempotent retry and rejection of changed duplicate |
| 11–13: Timer expiry, same results, next round | Verified |
| 14–16: Guest refresh/recovery, host loss | Verified in browser automation; mobile OS suspension remains unverified |
| 17–18: Incorrect code, full room | Verified honest timeout and rejection |
| 19: Multiple rooms | Verified two concurrent isolated rooms, including a Firefox guest |
| 20: Sixty actual users | **Unverified**; no capacity certification |

