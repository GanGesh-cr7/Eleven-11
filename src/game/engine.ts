import {
  defaults,
  type GameState,
  type Player,
  type Question,
  type Result,
} from "./types";
export function rankResults(
  players: Player[],
  ballots: Map<string, string>,
): Result[] {
  const counts = new Map(players.map((p) => [p.id, 0]));
  for (const id of ballots.values()) counts.set(id, (counts.get(id) || 0) + 1);
  const sorted = players
    .map((p) => ({
      id: p.id,
      name: p.name,
      votes: counts.get(p.id) || 0,
      rank: 0,
    }))
    .sort(
      (a, b) =>
        b.votes - a.votes ||
        a.name.localeCompare(b.name) ||
        a.id.localeCompare(b.id),
    );
  sorted.forEach(
    (p, i) =>
      (p.rank =
        i && p.votes === sorted[i - 1].votes ? sorted[i - 1].rank : i + 1),
  );
  return sorted;
}
export class GameEngine {
  state: GameState;
  ballots = new Map<string, string>();
  used = new Set<string>();
  constructor(code: string, host: Player) {
    this.state = {
      code,
      phase: "lobby",
      players: [host],
      settings: { ...defaults },
      round: null,
      history: [],
      custom: [],
      seq: 0,
    };
  }
  start(questions: Question[], now = Date.now()) {
    if (this.state.phase !== "lobby" && this.state.phase !== "results")
      throw Error("A round is already active.");
    if (this.state.history.length >= this.state.settings.rounds) {
      this.state.phase = "summary";
      return;
    }
    const eligible = this.state.players.filter((p) => p.online);
    if (eligible.length < 2) throw Error("Invite at least one friend to play.");
    const pool = [...questions, ...this.state.custom].filter(
      (q) =>
        !this.used.has(q.id) &&
        (this.state.settings.category === "all" ||
          q.category === this.state.settings.category),
    );
    if (!pool.length)
      throw Error(
        "No unused questions in this category. Add a question or choose another category.",
      );
    const q = pool[crypto.getRandomValues(new Uint32Array(1))[0] % pool.length];
    this.used.add(q.id);
    this.ballots.clear();
    this.state.round = {
      id: crypto.randomUUID(),
      number: this.state.history.length + 1,
      question: q,
      eligible: eligible.map((p) => ({ ...p })),
      deadline: now + this.state.settings.duration * 1000,
      voted: 0,
      results: [],
    };
    this.state.phase = "voting";
  }
  vote(voter: string, candidate: string, roundId: string, now = Date.now()) {
    const r = this.state.round;
    if (this.state.phase !== "voting" || !r || r.id !== roundId)
      throw Error("This round is closed.");
    if (now >= r.deadline) throw Error("Voting time has ended.");
    if (
      !r.eligible.some((p) => p.id === voter) ||
      !r.eligible.some((p) => p.id === candidate)
    )
      throw Error("Invalid voter or candidate.");
    if (this.ballots.has(voter)) {
      if (this.ballots.get(voter) === candidate) return;
      throw Error("Your vote has already been counted.");
    }
    if (!this.state.settings.selfVote && voter === candidate)
      throw Error("Self-voting is disabled.");
    this.ballots.set(voter, candidate);
    r.voted = this.ballots.size;
  }
  close() {
    if (this.state.phase !== "voting" || !this.state.round) return;
    this.state.round.results = rankResults(
      this.state.round.eligible,
      this.ballots,
    );
    this.state.history.push({
      ...structuredClone(this.state.round),
      eligible: [],
    });
    this.state.phase = "results";
    this.ballots.clear();
  }
  reset() {
    this.state.phase = "lobby";
    this.state.round = null;
    this.state.history = [];
    this.used.clear();
    this.ballots.clear();
  }
}
