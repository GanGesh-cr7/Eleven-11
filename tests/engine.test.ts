import { describe, it, expect } from "vitest";
import { GameEngine, rankResults } from "../src/game/engine";
import { questions } from "../src/data/questions";
import { envelopeSchema, codeForKey, codeValid } from "../src/network/protocol";
import { settingsSchema, type Player } from "../src/game/types";
const players: Player[] = [
  { id: "a", name: "Alex", host: true, online: true },
  { id: "b", name: "Blair", host: false, online: true },
  { id: "c", name: "Casey", host: false, online: true },
];
const setup = () => {
  const e = new GameEngine("test", players[0]);
  e.state.players = structuredClone(players);
  e.start(questions, 1000);
  return e;
};
describe("host round authority", () => {
  it("requires two real connected players", () => {
    const e = new GameEngine("test", players[0]);
    expect(() => e.start(questions)).toThrow("Invite");
  });
  it("freezes eligibility and uses a common deadline", () => {
    const e = setup();
    expect(e.state.round!.deadline).toBe(31000);
    e.state.players[0].online = false;
    expect(e.state.round!.eligible[0].online).toBe(true);
  });
  it("accepts a ballot once and acknowledges an identical retry without counting twice", () => {
    const e = setup();
    const id = e.state.round!.id;
    e.vote("a", "b", id, 1001);
    e.vote("a", "b", id, 1002);
    expect(e.state.round!.voted).toBe(1);
    expect(() => e.vote("a", "c", id, 1002)).toThrow("already");
  });
  it.each([
    ["unknown", "b", "valid", 1002],
    ["a", "unknown", "valid", 1002],
    ["a", "b", "wrong", 1002],
    ["a", "a", "valid", 1002],
    ["a", "b", "valid", 31000],
  ])("rejects invalid vote %s %s %s %s", (voter, candidate, round, now) => {
    const e = setup();
    expect(() =>
      e.vote(
        voter,
        candidate,
        round === "valid" ? e.state.round!.id : round,
        now,
      ),
    ).toThrow();
    expect(e.state.round!.voted).toBe(0);
  });
  it("allows configured self-voting", () => {
    const e = setup();
    e.state.settings.selfVote = true;
    e.vote("a", "a", e.state.round!.id, 1002);
    expect(e.state.round!.voted).toBe(1);
  });
  it("closes exactly once and clears private ballots", () => {
    const e = setup();
    e.vote("a", "b", e.state.round!.id, 1002);
    e.close();
    e.close();
    expect(e.state.history).toHaveLength(1);
    expect(e.ballots.size).toBe(0);
    expect(JSON.stringify(e.state)).not.toContain("ballots");
    expect(() => e.vote("c", "b", e.state.round!.id, 1003)).toThrow("closed");
  });
  it("can show a completed game summary after other players disconnect", () => {
    const e = setup();
    e.state.settings.rounds = 1;
    e.close();
    e.state.players.slice(1).forEach((p) => (p.online = false));
    e.start(questions);
    expect(e.state.phase).toBe("summary");
    expect(e.state.history[0].eligible).toEqual([]);
    expect(e.state.round!.eligible).toHaveLength(3);
  });
  it("preserves zero-vote candidates and tied ranks", () => {
    const r = rankResults(
      players,
      new Map([
        ["a", "b"],
        ["b", "a"],
      ]),
    );
    expect(r.map((p) => [p.name, p.votes, p.rank])).toEqual([
      ["Alex", 1, 1],
      ["Blair", 1, 1],
      ["Casey", 0, 3],
    ]);
  });
  it("does not repeat questions across rounds and ends configured games", () => {
    const e = setup();
    e.state.settings.rounds = 2;
    const q = e.state.round!.question.id;
    e.close();
    e.start(questions, 40000);
    expect(e.state.round!.question.id).not.toBe(q);
    e.close();
    e.start(questions);
    expect(e.state.phase).toBe("summary");
  });
  it("reports category exhaustion and accepts host custom questions", () => {
    const e = new GameEngine("test", players[0]);
    e.state.players = players;
    e.state.settings.category = "custom";
    expect(() => e.start(questions)).toThrow("No unused");
    e.state.custom = [
      {
        id: "custom",
        category: "custom",
        text: "Who would build a treehouse?",
      },
    ];
    e.start(questions);
    expect(e.state.round!.question.id).toBe("custom");
  });
  it("resets a session without retaining history or ballots", () => {
    const e = setup();
    e.close();
    e.reset();
    expect(e.state.phase).toBe("lobby");
    expect(e.state.history).toEqual([]);
    expect(e.used.size).toBe(0);
  });
});
describe("data and protocol boundary", () => {
  it("has at least 100 original, unique questions", () => {
    expect(questions.length).toBeGreaterThanOrEqual(100);
    expect(new Set(questions.map((q) => q.text)).size).toBe(questions.length);
  });
  it("rejects malformed envelopes and oversized configuration", () => {
    expect(envelopeSchema.safeParse({ type: "VOTE_SUBMIT" }).success).toBe(
      false,
    );
    expect(
      settingsSchema.safeParse({
        rounds: 1,
        duration: 12,
        category: "all",
        selfVote: true,
        capacity: 61,
      }).success,
    ).toBe(false);
  });
  it("derives a stable 80-bit room fingerprint from a host public key", async () => {
    const a = await codeForKey("public-key-a");
    expect(codeValid(a)).toBe(true);
    expect(await codeForKey("public-key-a")).toBe(a);
    expect(await codeForKey("public-key-b")).not.toBe(a);
  });
});
