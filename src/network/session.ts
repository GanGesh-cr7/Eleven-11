import { joinRoom, type Room } from "trystero";
import { GameEngine } from "../game/engine";
import { questions } from "../data/questions";
import { type GameState, type Question, type Settings } from "../game/types";
import {
  codeForKey,
  envelopeSchema,
  fromHex,
  randomSecret,
  toHex,
  type Envelope,
  type Payload,
} from "./protocol";

type Link = {
  room: Room;
  send: (p: Payload, round?: string | null, target?: string) => void;
  peer: string;
  member: string;
  channel: string;
};
type Saved = {
  code: string;
  name: string;
  token: string;
  id: string;
  channel: string;
  host: boolean;
};
export type View = {
  state: GameState | null;
  id: string;
  isHost: boolean;
  status: string;
  error: string;
  ack: boolean;
  offset: number;
  metrics: {
    connections: number;
    connectMs: number;
    disconnects: number;
    latency: number;
    joinAttempts: number;
    admissions: number;
    eventMs: number;
    peakConnections: number;
    memoryMB: number | null;
  };
};
const config = () => ({
  appId: "eleven11-v1",
  identity: "none" as const,
  maxReceiveBytes: 512 * 1024,
  rtcConfig: {
    iceServers: [
      { urls: "stun:stun.cloudflare.com:3478" },
      { urls: "stun:stun.l.google.com:19302" },
    ],
  },
  ...(import.meta.env.VITE_NOSTR_RELAYS
    ? { relayConfig: { urls: import.meta.env.VITE_NOSTR_RELAYS.split(",") } }
    : {}),
  ...(sessionStorage.getItem("eleven-turn")
    ? { turnConfig: JSON.parse(sessionStorage.getItem("eleven-turn")!) }
    : {}),
});
export class Session {
  view: View = {
    state: null,
    id: "",
    isHost: false,
    status: "idle",
    error: "",
    ack: false,
    offset: 0,
    metrics: {
      connections: 0,
      connectMs: 0,
      disconnects: 0,
      latency: 0,
      joinAttempts: 0,
      admissions: 0,
      eventMs: 0,
      peakConnections: 0,
      memoryMB: null,
    },
  };
  private listeners = new Set<() => void>();
  private rooms = new Set<Room>();
  private discovery?: Room;
  private engine?: GameEngine;
  private links = new Map<string, Link>();
  private guest?: Link;
  private members = new Map<string, { id: string; channel: string }>();
  private seen = new Set<string>();
  private offers = new Set<string>();
  private timer?: ReturnType<typeof setInterval>;
  private timeout?: ReturnType<typeof setTimeout>;
  private lastHost = Date.now();
  private started = 0;
  private ticks = 0;
  private saved?: Saved;
  private closed = false;
  private code = "";
  private key?: CryptoKeyPair;
  private pub = "";
  private nonce = crypto.randomUUID();
  private voted = new Set<string>();
  private rates = new Map<string, { at: number; count: number }>();
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  getSnapshot = () => this.view;
  private update(p: Partial<View> = {}) {
    this.view = { ...this.view, ...p };
    this.listeners.forEach((f) => f());
  }
  private envelope(
    payload: Payload,
    round: string | null = this.engine?.state.round?.id ||
      this.view.state?.round?.id ||
      null,
  ): Envelope {
    return {
      v: 1,
      room: this.code,
      id: crypto.randomUUID(),
      sender: this.view.id || "unadmitted",
      round,
      time: Date.now(),
      payload,
    };
  }
  private room(id: string) {
    const r = joinRoom(config(), id);
    this.rooms.add(r);
    r.onError((e) => {
      if (e.code === "peer-connect-failed")
        this.update({
          error:
            "A direct connection failed. Try another network or configure TURN in connection settings.",
        });
    });
    return r;
  }
  private channel(room: Room, callback: (m: Envelope, peer: string) => void) {
    const action = room.makeAction<string>("events");
    action.onReceive(({ byteLength }) => byteLength <= 512 * 1024);
    action.onMessage((raw, { peerId }) => {
      try {
        if (typeof raw !== "string" || raw.length > 512 * 1024) return;
        const parsed = envelopeSchema.safeParse(JSON.parse(raw));
        if (
          !parsed.success ||
          parsed.data.room !== this.code ||
          this.seen.has(parsed.data.id)
        )
          return;
        let rate = this.rates.get(peerId);
        if (!rate || Date.now() - rate.at > 1000) {
          rate = { at: Date.now(), count: 0 };
          this.rates.set(peerId, rate);
        }
        if (++rate.count > 40) return;
        this.seen.add(parsed.data.id);
        if (this.seen.size > 2000)
          this.seen.delete(this.seen.values().next().value!);
        if (
          !this.view.isHost &&
          this.guest?.peer === peerId &&
          this.view.metrics.latency > 0 &&
          (parsed.data.payload.type === "STATE_SNAPSHOT" ||
            parsed.data.payload.type === "VOTE_PROGRESS")
        )
          this.update({
            metrics: {
              ...this.view.metrics,
              eventMs: Math.max(
                0,
                Date.now() + this.view.offset - parsed.data.time,
              ),
            },
          });
        callback(parsed.data, peerId);
      } catch {
        /* Invalid remote input is ignored. */
      }
    });
    return (payload: Payload, peer?: string, round?: string | null) => {
      void action
        .send(
          JSON.stringify(this.envelope(payload, round)),
          peer ? { target: peer } : undefined,
        )
        .catch(() => {});
    };
  }
  private save() {
    if (this.saved)
      sessionStorage.setItem("eleven-session", JSON.stringify(this.saved));
  }
  async create(name: string) {
    await this.leave(false);
    this.closed = false;
    this.started = Date.now();
    this.key = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"],
    );
    this.pub = toHex(await crypto.subtle.exportKey("spki", this.key.publicKey));
    this.code = await codeForKey(this.pub);
    const id = crypto.randomUUID();
    this.engine = new GameEngine(this.code, {
      id,
      name,
      online: true,
      host: true,
    });
    this.saved = {
      code: this.code,
      name,
      id,
      token: "",
      channel: "",
      host: true,
    };
    this.save();
    this.update({
      id,
      isHost: true,
      status: "connected",
      state: structuredClone(this.engine.state),
      error: "",
      ack: false,
    });
    this.discovery = this.room(`discovery:${this.code}`);
    const send = this.channel(this.discovery, (m, peer) => {
      if (m.payload.type === "JOIN_REQUEST")
        void this.offer(m.payload, peer, send);
    });
    this.run();
    return this.code;
  }
  private async offer(
    p: Extract<Payload, { type: "JOIN_REQUEST" }>,
    peer: string,
    send: (p: Payload, peer?: string) => void,
  ) {
    if (!this.key || this.closed) return;
    if (!this.offers.has(p.nonce)) {
      this.offers.add(p.nonce);
      if (this.offers.size > 2000)
        this.offers.delete(this.offers.values().next().value!);
      this.update({
        metrics: {
          ...this.view.metrics,
          joinAttempts: this.view.metrics.joinAttempts + 1,
        },
      });
    }
    if (this.links.size >= this.engine!.state.settings.capacity + 8) {
      send({ type: "JOIN_REJECTED", reason: "This room is full." }, peer);
      return;
    }
    const existing = this.members.get(p.token);
    const channel = existing?.channel || randomSecret();
    if (!this.links.has(channel)) this.hostLink(channel);
    const data = `${p.nonce}:${channel}`;
    const signature = toHex(
      await crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        this.key.privateKey,
        new TextEncoder().encode(data),
      ),
    );
    send(
      { type: "HELLO", key: this.pub, channel, nonce: p.nonce, signature },
      peer,
    );
  }
  private hostLink(channel: string) {
    const room = this.room(`pair:${channel}`);
    const link: Link = { room, channel, peer: "", member: "", send: () => {} };
    this.links.set(channel, link);
    const send = this.channel(
      room,
      (m, peer) => void this.hostMessage(link, m, peer).catch(() => {}),
    );
    link.send = (p, r, target) => send(p, target || link.peer, r);
    room.onPeerLeave(({ peerId }) => {
      if (link.peer !== peerId) return;
      link.peer = "";
      const player = this.engine?.state.players.find(
        (p) => p.id === link.member,
      );
      if (player) {
        player.online = false;
        this.view.metrics.disconnects++;
        this.publish();
      }
    });
    // Unclaimed channels expire, so discovery probes cannot retain unlimited rooms.
    setTimeout(() => {
      if (!link.member) {
        void room.leave();
        this.rooms.delete(room);
        this.links.delete(channel);
      }
    }, 45000);
  }
  private async hostMessage(link: Link, m: Envelope, peer: string) {
    const p = m.payload;
    const engine = this.engine!;
    if (p.type === "ADMIT") {
      const prior = this.members.get(p.token);
      const active =
        prior &&
        [...this.links.values()].some(
          (l) => l.member === prior.id && l.peer && l.peer !== peer,
        );
      const reject = (reason: string) =>
        link.send({ type: "JOIN_REJECTED", reason }, undefined, peer);
      if (active) {
        reject("This player is already connected in another tab.");
        return;
      }
      if (prior && prior.channel !== link.channel) return;
      if (!prior && link.member) {
        reject("Invalid reconnection credential.");
        return;
      }
      if (
        !prior &&
        engine.state.players.length >= engine.state.settings.capacity
      ) {
        reject("This room is full.");
        return;
      }
      if (!prior && engine.state.phase !== "lobby") {
        reject("The game has started. Ask the host to play again.");
        return;
      }
      const initialAdmission = !link.member;
      const id = prior?.id || crypto.randomUUID();
      const token = prior ? p.token : randomSecret();
      this.members.set(token, { id, channel: link.channel });
      link.member = id;
      link.peer = peer;
      let player = engine.state.players.find((x) => x.id === id);
      if (player) player.online = true;
      else
        engine.state.players.push({
          id,
          name: p.name,
          online: true,
          host: false,
        });
      const proof = `${p.nonce}:${link.channel}:${id}:${token}`;
      const signature = toHex(
        await crypto.subtle.sign(
          { name: "ECDSA", hash: "SHA-256" },
          this.key!.privateKey,
          new TextEncoder().encode(proof),
        ),
      );
      link.send({
        type: "JOIN_ACCEPTED",
        key: this.pub,
        nonce: p.nonce,
        signature,
        id,
        token,
        state: engine.state,
        ack: this.voted.has(`${engine.state.round?.id}:${id}`),
      });
      if (initialAdmission)
        this.update({
          metrics: {
            ...this.view.metrics,
            admissions: this.view.metrics.admissions + 1,
            connectMs: this.view.metrics.connectMs,
          },
        });
      this.publish();
      return;
    }
    if (link.peer !== peer || !link.member || m.sender !== link.member) return;
    if (p.type === "PING")
      link.send({ type: "HOST_HEARTBEAT", sent: p.sent, hostTime: Date.now() });
    if (p.type === "STATE_REQUEST") {
      link.send({ type: "HOST_HEARTBEAT", sent: p.sent, hostTime: Date.now() });
      link.send({
        type: "STATE_SNAPSHOT",
        state: engine.state,
        ack: this.voted.has(`${engine.state.round?.id}:${link.member}`),
      });
    }
    if (p.type === "VOTE_SUBMIT") {
      try {
        engine.vote(link.member, p.candidate, m.round || "");
        this.voted.add(`${m.round}:${link.member}`);
        link.send({ type: "VOTE_ACK" });
        this.afterVote();
      } catch (e) {
        link.send({ type: "ACTION_ERROR", reason: (e as Error).message });
      }
    }
    if (p.type === "LEAVE") {
      const player = engine.state.players.find((x) => x.id === link.member);
      if (player) player.online = false;
      link.peer = "";
      this.publish();
    }
  }
  async join(code: string, name: string, resume?: Saved) {
    await this.leave(false);
    this.closed = false;
    this.code = code;
    this.nonce = crypto.randomUUID();
    this.started = Date.now();
    this.saved = resume || {
      code,
      name,
      token: "",
      id: "",
      channel: "",
      host: false,
    };
    this.update({
      state: null,
      id: this.saved.id,
      isHost: false,
      status: "connecting",
      metrics: {
        ...this.view.metrics,
        joinAttempts: this.view.metrics.joinAttempts + 1,
      },
      error: "",
      ack: false,
    });
    this.lastHost = Date.now();
    if (this.saved.channel) this.guestLink(this.saved.channel);
    else {
      this.discovery = this.room(`discovery:${code}`);
      const send = this.channel(this.discovery, (m, peer) => {
        if (m.payload.type === "HELLO") void this.verifyOffer(m.payload);
        if (m.payload.type === "JOIN_REJECTED")
          this.update({ error: m.payload.reason, status: "error" });
      });
      this.discovery.onPeerJoin(({ peerId }) =>
        send(
          {
            type: "JOIN_REQUEST",
            name,
            token: this.saved!.token,
            nonce: this.nonce,
          },
          peerId,
        ),
      );
    }
    this.timeout = setTimeout(() => {
      if (this.view.status !== "connected") {
        this.update({
          status: "error",
          error:
            "No active host could be reached. Check the room code, keep the host tab open, or try another network / TURN.",
        });
        void this.stopRooms();
      }
    }, 30000);
    this.run();
  }
  private async verifyOffer(p: Extract<Payload, { type: "HELLO" }>) {
    if (p.nonce !== this.nonce || this.guest) return;
    try {
      if ((await codeForKey(p.key)) !== this.code) return;
      const key = await crypto.subtle.importKey(
        "spki",
        fromHex(p.key),
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["verify"],
      );
      const ok = await crypto.subtle.verify(
        { name: "ECDSA", hash: "SHA-256" },
        key,
        fromHex(p.signature),
        new TextEncoder().encode(`${p.nonce}:${p.channel}`),
      );
      if (ok && !this.guest) this.guestLink(p.channel);
    } catch {
      /* Unverified host is ignored. */
    }
  }
  private guestLink(channel: string) {
    this.saved!.channel = channel;
    const room = this.room(`pair:${channel}`);
    const link: Link = { room, channel, peer: "", member: "", send: () => {} };
    this.guest = link;
    const send = this.channel(room, (m, peer) => {
      if (link.peer && link.peer !== peer) return;
      const p = m.payload;
      if (p.type === "JOIN_ACCEPTED") void this.acceptGuest(p, peer, link);
      if (p.type === "STATE_SNAPSHOT" && link.peer === peer) {
        this.lastHost = Date.now();
        if (!this.view.state || p.state.seq >= this.view.state.seq)
          this.update({ state: p.state, ack: p.ack, status: "connected" });
      }
      if (p.type === "HOST_HEARTBEAT" && link.peer === peer) {
        this.lastHost = Date.now();
        const rtt = Date.now() - p.sent;
        this.update({
          offset: p.hostTime - (p.sent + rtt / 2),
          status: "connected",
          error:
            this.view.status === "reconnecting" || this.view.status === "error"
              ? ""
              : this.view.error,
          metrics: { ...this.view.metrics, latency: rtt },
        });
      }
      if (
        p.type === "VOTE_PROGRESS" &&
        link.peer === peer &&
        m.round === this.view.state?.round?.id
      ) {
        const state = structuredClone(this.view.state);
        state.round!.voted = p.count;
        this.update({ state });
      }
      if (p.type === "VOTE_ACK" && link.peer === peer)
        this.update({ ack: true, error: "" });
      if (p.type === "ACTION_ERROR") this.update({ error: p.reason });
      if (p.type === "JOIN_REJECTED") {
        this.closed = true;
        if (this.timeout) clearTimeout(this.timeout);
        if (this.timer) clearInterval(this.timer);
        this.update({ error: p.reason, status: "error" });
        void this.stopRooms();
      }
    });
    link.send = (p, r) => send(p, link.peer || undefined, r);
    room.onPeerJoin(({ peerId }) => {
      if (link.peer) return;
      send(
        {
          type: "ADMIT",
          name: this.saved!.name,
          token: this.saved!.token,
          nonce: this.nonce,
        },
        peerId,
      );
    });
    room.onPeerLeave(({ peerId }) => {
      if (!this.closed && link.peer === peerId) {
        link.peer = "";
        this.view.metrics.disconnects++;
        this.update({
          status: "reconnecting",
          error:
            "Host disconnected. Trying to reconnect for 30 seconds. The game may end if the host does not return.",
        });
      }
    });
  }
  private async acceptGuest(
    p: Extract<Payload, { type: "JOIN_ACCEPTED" }>,
    peer: string,
    link: Link,
  ) {
    try {
      if (p.nonce !== this.nonce || (await codeForKey(p.key)) !== this.code)
        return;
      const key = await crypto.subtle.importKey(
        "spki",
        fromHex(p.key),
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["verify"],
      );
      const proof = `${p.nonce}:${link.channel}:${p.id}:${p.token}`;
      if (
        !(await crypto.subtle.verify(
          { name: "ECDSA", hash: "SHA-256" },
          key,
          fromHex(p.signature),
          new TextEncoder().encode(proof),
        )) ||
        this.closed ||
        this.guest !== link
      )
        return;
      if (link.peer && link.peer !== peer) return;
      link.peer = peer;
      this.saved = { ...this.saved!, id: p.id, token: p.token };
      this.save();
      this.lastHost = Date.now();
      if (this.timeout) clearTimeout(this.timeout);
      this.update({
        state: p.state,
        id: p.id,
        status: "connected",
        ack: p.ack,
        error: "",
        metrics: {
          ...this.view.metrics,
          connectMs: Date.now() - this.started,
          admissions: this.view.metrics.admissions + (this.view.state ? 0 : 1),
        },
      });
      if (this.discovery) {
        void this.discovery.leave();
        this.rooms.delete(this.discovery);
        this.discovery = undefined;
      }
    } catch {
      /* Ignore an unverifiable admission. */
    }
  }
  private run() {
    this.timer = setInterval(() => {
      if (this.closed) return;
      this.ticks++;
      let connections = 0;
      for (const room of this.rooms)
        connections += Object.values(room.getPeers()).filter(
          (p) => p.direct,
        ).length;
      const heap = (
        performance as Performance & { memory?: { usedJSHeapSize: number } }
      ).memory;
      this.update({
        metrics: {
          ...this.view.metrics,
          connections,
          peakConnections: Math.max(
            connections,
            this.view.metrics.peakConnections,
          ),
          memoryMB: heap ? heap.usedJSHeapSize / 1048576 : null,
        },
      });
      if (this.engine) {
        if (
          this.engine.state.phase === "voting" &&
          Date.now() >= this.engine.state.round!.deadline
        ) {
          this.engine.close();
          this.publish();
        }
        if (this.ticks % 15 === 0) this.publish(false);
      } else if (this.guest) {
        if (this.ticks % 2 === 0 && (this.guest.peer || !this.view.state)) {
          if (!this.view.state)
            this.guest.send({
              type: "ADMIT",
              nonce: this.nonce,
              name: this.saved!.name,
              token: this.saved!.token,
            });
          else this.guest.send({ type: "PING", sent: Date.now() });
        }
        const silence = Date.now() - this.lastHost;
        if (silence > 10000)
          this.update({
            status: silence > 30000 ? "error" : "reconnecting",
            error:
              silence > 30000
                ? "Host unavailable. The game cannot continue without the original host."
                : "Host disconnected. Attempting reconnection…",
          });
      }
    }, 1000);
  }
  private publish(increment = true) {
    if (!this.engine) return;
    if (increment) this.engine.state.seq++;
    this.update({
      state: structuredClone(this.engine.state),
      ack: this.voted.has(`${this.engine.state.round?.id}:${this.view.id}`),
    });
    for (const link of this.links.values())
      if (link.peer && link.member)
        link.send({
          type: "STATE_SNAPSHOT",
          state: this.engine.state,
          ack: this.voted.has(`${this.engine.state.round?.id}:${link.member}`),
        });
  }
  private afterVote() {
    const r = this.engine!.state.round!;
    if (r.voted === r.eligible.length) {
      this.engine!.close();
      this.publish();
      return;
    }
    this.update({
      state: structuredClone(this.engine!.state),
      ack: this.voted.has(`${r.id}:${this.view.id}`),
    });
    for (const l of this.links.values())
      if (l.peer && l.member) l.send({ type: "VOTE_PROGRESS", count: r.voted });
  }
  vote(candidate: string) {
    try {
      if (this.engine) {
        this.engine.vote(this.view.id, candidate, this.engine.state.round!.id);
        this.voted.add(`${this.engine.state.round!.id}:${this.view.id}`);
        this.afterVote();
      } else this.guest?.send({ type: "VOTE_SUBMIT", candidate });
    } catch (e) {
      this.update({ error: (e as Error).message });
    }
  }
  start() {
    try {
      this.engine?.start(questions);
      this.publish();
      this.update({ error: "" });
    } catch (e) {
      this.update({ error: (e as Error).message });
    }
  }
  settings(settings: Settings) {
    if (this.engine?.state.phase === "lobby") {
      this.engine.state.settings = settings;
      this.publish();
    }
  }
  custom(question: Question) {
    if (this.engine && this.engine.state.custom.length < 200) {
      this.engine.state.custom.push(question);
      this.publish();
    }
  }
  reset() {
    this.engine?.reset();
    this.voted.clear();
    this.publish();
  }
  kick(id: string) {
    if (!this.engine || id === this.view.id) return;
    for (const [token, m] of this.members)
      if (m.id === id) this.members.delete(token);
    for (const [channel, l] of this.links)
      if (l.member === id) {
        l.send({
          type: "JOIN_REJECTED",
          reason: "The host removed you from this room.",
        });
        void l.room.leave();
        this.rooms.delete(l.room);
        this.links.delete(channel);
      }
    this.engine.state.players = this.engine.state.players.filter(
      (p) => p.id !== id,
    );
    this.publish();
  }
  clearError() {
    this.update({ error: "" });
  }
  private async stopRooms() {
    await Promise.allSettled([...this.rooms].map((r) => r.leave()));
    this.rooms.clear();
  }
  async leave(clear = true) {
    this.closed = true;
    if (this.timer) clearInterval(this.timer);
    if (this.timeout) clearTimeout(this.timeout);
    this.guest?.send({ type: "LEAVE" });
    await this.stopRooms();
    this.links.clear();
    this.members.clear();
    this.engine = undefined;
    this.guest = undefined;
    this.discovery = undefined;
    this.seen.clear();
    this.rates.clear();
    this.offers.clear();
    this.voted.clear();
    if (clear) sessionStorage.removeItem("eleven-session");
    this.update({ state: null, status: "idle", error: "", ack: false });
  }
  async restore(code: string) {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("eleven-session") || "null",
      ) as Saved | null;
      if (saved?.code === code) {
        if (saved.host) {
          this.update({
            status: "error",
            error:
              "The host page was refreshed. Active room state was held in memory and this game has ended. Create a new room.",
          });
          return;
        }
        await this.join(code, saved.name, saved);
      }
    } catch {
      this.update({
        error: "Could not restore this session. Please join again.",
        status: "error",
      });
    }
  }
}
export const session = new Session();

// Development diagnostics only: Playwright inspects the live instance, never a simulated room.
if (import.meta.env.DEV) Object.assign(window, { __elevenSession: session });
