import { z } from "zod";
import { questionSchema, settingsSchema, stateSchema } from "../game/types";
const payload = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ACTION_ERROR"), reason: z.string().max(300) }),
  z.object({
    type: z.literal("JOIN_REQUEST"),
    name: z.string().trim().min(1).max(20),
    token: z.string().max(100),
    nonce: z.string().uuid(),
  }),
  z.object({
    type: z.literal("HELLO"),
    key: z.string().max(500),
    channel: z.string().length(64),
    nonce: z.string().uuid(),
    signature: z.string().max(300),
  }),
  z.object({
    type: z.literal("ADMIT"),
    nonce: z.string().uuid(),
    name: z.string().trim().min(1).max(20),
    token: z.string().max(100),
  }),
  z.object({
    type: z.literal("JOIN_ACCEPTED"),
    key: z.string().max(500),
    nonce: z.string().uuid(),
    signature: z.string().max(300),
    id: z.string(),
    token: z.string(),
    state: stateSchema,
    ack: z.boolean(),
  }),
  z.object({ type: z.literal("JOIN_REJECTED"), reason: z.string().max(300) }),
  z.object({
    type: z.literal("STATE_SNAPSHOT"),
    state: stateSchema,
    ack: z.boolean(),
  }),
  z.object({ type: z.literal("VOTE_SUBMIT"), candidate: z.string().max(100) }),
  z.object({ type: z.literal("VOTE_ACK") }),
  z.object({
    type: z.literal("VOTE_PROGRESS"),
    count: z.number().int().min(0).max(60),
  }),
  z.object({ type: z.literal("PING"), sent: z.number() }),
  z.object({ type: z.literal("STATE_REQUEST"), sent: z.number() }),
  z.object({
    type: z.literal("HOST_HEARTBEAT"),
    sent: z.number(),
    hostTime: z.number(),
  }),
  z.object({ type: z.literal("SETTINGS"), settings: settingsSchema }),
  z.object({ type: z.literal("CUSTOM"), question: questionSchema }),
  z.object({ type: z.literal("LEAVE") }),
]);
export const envelopeSchema = z.object({
  v: z.literal(1),
  room: z.string().max(40),
  id: z.string().uuid(),
  sender: z.string().max(100),
  round: z.string().nullable(),
  time: z.number(),
  payload,
});
export type Payload = z.infer<typeof payload>;
export type Envelope = z.infer<typeof envelopeSchema>;
export const randomSecret = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
export async function codeForKey(key: string) {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key)),
  );
  return Array.from(digest.slice(0, 10), (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}
export { codeValid } from "./code";
export const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
export const fromHex = (hex: string) =>
  new Uint8Array(hex.match(/.{2}/g)!.map((x) => parseInt(x, 16)));
