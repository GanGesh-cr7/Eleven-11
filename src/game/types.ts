import { z } from "zod";
export const categories = [
  "funny",
  "friendship",
  "personality",
  "college",
  "compliments",
  "random",
  "custom",
] as const;
export const questionSchema = z.object({
  id: z.string().max(100),
  category: z.enum(categories),
  text: z.string().trim().min(8).max(240),
});
export type Question = z.infer<typeof questionSchema>;
export const playerSchema = z.object({
  id: z.string().max(100),
  name: z.string().trim().min(1).max(20),
  online: z.boolean(),
  host: z.boolean(),
});
export type Player = z.infer<typeof playerSchema>;
export const settingsSchema = z.object({
  rounds: z.number().int().min(1).max(30),
  duration: z.union([
    z.literal(15),
    z.literal(30),
    z.literal(45),
    z.literal(60),
    z.literal(90),
  ]),
  category: z.enum(["all", ...categories]),
  selfVote: z.boolean(),
  capacity: z.number().int().min(2).max(60),
});
export type Settings = z.infer<typeof settingsSchema>;
export const resultSchema = z.object({
  id: z.string(),
  name: z.string(),
  votes: z.number().int().nonnegative(),
  rank: z.number().int().positive(),
});
export type Result = z.infer<typeof resultSchema>;
export const roundSchema = z.object({
  id: z.string(),
  number: z.number().int(),
  question: questionSchema,
  eligible: z.array(playerSchema).max(60),
  deadline: z.number(),
  voted: z.number().int().nonnegative(),
  results: z.array(resultSchema).max(60),
});
export type Round = z.infer<typeof roundSchema>;
export const stateSchema = z.object({
  code: z.string(),
  phase: z.enum(["lobby", "voting", "results", "summary"]),
  players: z.array(playerSchema).max(60),
  settings: settingsSchema,
  round: roundSchema.nullable(),
  history: z.array(roundSchema).max(30),
  custom: z.array(questionSchema).max(200),
  seq: z.number().int(),
});
export type GameState = z.infer<typeof stateSchema>;
export const defaults: Settings = {
  rounds: 5,
  duration: 30,
  category: "all",
  selfVote: false,
  capacity: 12,
};
