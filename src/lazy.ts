// Heavy modules (WebRTC networking, Zod schemas, Motion animations) are split
// out of the first-paint bundle. These loaders are shared so a prefetch and a
// later real import resolve to the same chunk.
export const loadSession = () => import("./network/session");
export const loadRoom = () => import("./pages/GameRoom");
export const loadQuestions = () => import("./pages/Questions");

/** Run work once the browser is idle so prefetching never competes with first paint. */
export function whenIdle(work: () => void) {
  if ("requestIdleCallback" in window) {
    const id = requestIdleCallback(work, { timeout: 2500 });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(work, 400);
  return () => clearTimeout(id);
}
