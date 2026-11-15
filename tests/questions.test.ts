import { describe, expect, test } from "vitest";
import { parseQuestionList } from "../src/data/questions";

describe("parseQuestionList", () => {
  test("splits several questions pasted on one line", () => {
    expect(parseQuestionList("who is handsome ? who is boy ?")).toEqual({
      texts: ["who is handsome ?", "who is boy ?"],
      skipped: 0,
    });
  });
  test("handles numbered, bulleted, bold and quoted lists from a chat", () => {
    const pasted = [
      "1. Who would win a staring contest?",
      "2) **Who cries at movies?**",
      "- Who is always late?",
      "",
      "• “Who texts back fastest?”",
      "Who would plan the trip",
    ].join("\n");
    expect(parseQuestionList(pasted).texts).toEqual([
      "Who would win a staring contest?",
      "Who cries at movies?",
      "Who is always late?",
      "Who texts back fastest?",
      "Who would plan the trip",
    ]);
  });
  test("keeps a quoted question mark inside one question", () => {
    expect(
      parseQuestionList('Who would ask "why?" every single time?').texts,
    ).toEqual(['Who would ask "why?" every single time?']);
  });
  test("drops duplicates and too-short pieces", () => {
    expect(
      parseQuestionList("Who is late?Who is late?Who is new? Hi?", [
        "WHO IS NEW?",
      ]),
    ).toEqual({ texts: ["Who is late?"], skipped: 3 });
  });
});
