import { useEffect, useState, type RefObject } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useReducedMotion,
} from "motion/react";

const confettiColors = [
  "#8064c8",
  "#c6afd9",
  "#f5c66b",
  "#f29b8a",
  "#8fc1a1",
  "#7f95d1",
];

/** A one-shot confetti burst on a fixed, click-through layer. */
export function Confetti({
  count = 44,
  delay = 0,
  originY = 35,
  anchor,
}: {
  count?: number;
  /** Seconds to wait before bursting. */
  delay?: number;
  /** Vertical burst origin as a percentage of the viewport height. */
  originY?: number;
  /** Burst from this element's centre instead, measured when the burst starts. */
  anchor?: RefObject<HTMLElement | null>;
}) {
  const reduce = useReducedMotion();
  const [done, setDone] = useState(false);
  const [origin, setOrigin] = useState<{ left: string; top: string } | null>(
    null,
  );
  useEffect(() => {
    const t = setTimeout(() => {
      const rect = anchor?.current?.getBoundingClientRect();
      setOrigin(
        rect
          ? {
              left: `${rect.left + rect.width / 2}px`,
              top: `${rect.top + rect.height / 2}px`,
            }
          : { left: "50%", top: `${originY}%` },
      );
    }, delay * 1000);
    return () => clearTimeout(t);
  }, [anchor, delay, originY]);
  const [pieces] = useState(() =>
    Array.from({ length: count }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const power = 120 + Math.random() * 260;
      return {
        id: i,
        x: Math.cos(angle) * power * 1.4,
        y: Math.sin(angle) * power * 0.7 - 160,
        fall: 380 + Math.random() * 240,
        rotate: Math.random() * 900 - 450,
        color: confettiColors[i % confettiColors.length],
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        round: Math.random() > 0.65,
        delay: Math.random() * 0.12,
      };
    }),
  );
  useEffect(() => {
    const t = setTimeout(() => setDone(true), (delay + 3) * 1000);
    return () => clearTimeout(t);
  }, [delay]);
  if (reduce || done || !origin) return null;
  return (
    <div className="confetti-layer" aria-hidden="true">
      <div className="confetti-origin" style={origin}>
        {pieces.map((p) => (
          <motion.span
            key={p.id}
            style={{
              background: p.color,
              width: p.w,
              height: p.round ? p.w : p.h,
              borderRadius: p.round ? "50%" : 2,
            }}
            initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0.4 }}
            animate={{
              x: [0, p.x * 0.85, p.x],
              y: [0, p.y, p.y + p.fall],
              opacity: [1, 1, 0],
              rotate: p.rotate,
              scale: 1,
            }}
            transition={{
              duration: 2.4,
              delay: p.delay,
              times: [0, 0.32, 1],
              ease: ["easeOut", "easeIn"],
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Counts from 0 up to a value. Shows the value immediately for reduced motion. */
export function CountUp({
  value,
  delay = 0,
  duration = 0.9,
}: {
  value: number;
  delay?: number;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce) {
      setShown(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      delay,
      ease: "easeOut",
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, delay, duration, reduce]);
  return <>{shown}</>;
}

/** Slot-machine style name shuffle shown while the host counts votes. */
export function Drumroll({ names }: { names: string[] }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reduce || names.length < 2) return;
    let wait = 65;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setIndex((i) => (i + 1) % names.length);
      wait = Math.min(wait * 1.13, 340);
      timer = setTimeout(tick, wait);
    };
    timer = setTimeout(tick, wait);
    return () => clearTimeout(timer);
  }, [names.length, reduce]);
  return (
    <div className="drumroll">
      <motion.span
        className="drum"
        aria-hidden="true"
        animate={{ rotate: [-10, 10, -10], y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 0.28 }}
      >
        🥁
      </motion.span>
      <p role="status">Who’s it gonna be?</p>
      {names.length > 0 && !reduce && (
        <div className="slot" aria-hidden="true">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.b
              key={index}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -30, opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              {names[index]}
            </motion.b>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

const reactions = ["👀", "😏", "🤭", "😂", "🫣", "🔥", "💜", "🙈", "😎", "🤔"];
export const randomReaction = () =>
  reactions[Math.floor(Math.random() * reactions.length)];

/** Reveals a sentence word by word. */
export function RevealText({
  text,
  delay = 0.1,
}: {
  text: string;
  delay?: number;
}) {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <span key={i}>
          <motion.span
            className="reveal-word"
            initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              delay: delay + Math.min(i * 0.055, 0.9),
              duration: 0.4,
            }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}
