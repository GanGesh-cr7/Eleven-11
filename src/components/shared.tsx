import { useEffect, useRef, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { session } from "../network/session";
import type { Player } from "../game/types";
export const useGame = () =>
  useSyncExternalStore(session.subscribe, session.getSnapshot);

export const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function Avatar({
  player,
  index = 0,
}: {
  player: Pick<Player, "name">;
  index?: number;
}) {
  return (
    <span className={`avatar color-${index % 5}`}>
      {player.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function Modal({
  title: heading,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          'button,input,select,a,textarea,[tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      before?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={heading}
      >
        <div className="row between">
          <h2>{heading}</h2>
          <Button variant="ghost" aria-label="Close dialog" onClick={close}>
            <X size={20} />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
