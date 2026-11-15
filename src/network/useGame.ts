import { useSyncExternalStore } from "react";
import { session } from "./session";
export const useGame = () =>
  useSyncExternalStore(session.subscribe, session.getSnapshot);
