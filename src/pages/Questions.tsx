import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { title } from "../components/shared";
import { useGame } from "../network/useGame";
import { session } from "../network/session";
import { categories, type Question } from "../game/types";
import {
  addedMessage,
  parseQuestionList,
  questions,
  readSavedQuestions,
  saveQuestions,
  toCustomQuestions,
} from "../data/questions";
export const categoryIcons: Record<string, string> = {
  all: "✦",
  funny: "😂",
  friendship: "🫶",
  personality: "🪩",
  college: "🎓",
  compliments: "💜",
  random: "🎲",
  custom: "✍️",
};

export function Questions() {
  const game = useGame();
  const [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [custom, setCustom] = useState<Question[]>(readSavedQuestions),
    [text, setText] = useState(""),
    [save, setSave] = useState(false),
    [notice, setNotice] = useState("");
  const all = [
    ...questions,
    ...custom,
    ...(game.state?.custom || []).filter(
      (q) => !custom.some((c) => c.id === q.id),
    ),
  ];
  const selected = all.filter(
    (q) =>
      (filter === "all" || q.category === filter) &&
      q.text.toLowerCase().includes(search.toLowerCase()),
  );
  const live = game.isHost && game.state;
  // Paste one question or a whole list; it's split into separate questions.
  const parsed = parseQuestionList(
    text,
    all.map((q) => q.text),
  );
  const count = parsed.texts.length;
  function add(e: FormEvent) {
    e.preventDefault();
    if (!count) return;
    const added = toCustomQuestions(parsed.texts);
    setCustom((c) => [...c, ...added]);
    if (save) saveQuestions(added);
    if (live) for (const q of added) session.custom(q);
    setText("");
    setNotice(
      `${addedMessage(count, parsed.skipped)} ${
        live
          ? "They’re in your live room."
          : save
            ? "Saved on this device."
            : "Kept for this visit. Enable saving to keep them."
      }`,
    );
  }
  return (
    <main className="questions-page">
      <div className="page-heading">
        <div className="eyebrow">A QUESTION FOR EVERY KIND OF FRIEND</div>
        <h1>
          Find your group’s vibe<span>.</span>
        </h1>
        <p>
          From inside jokes to unexpected compliments. {questions.length} ways
          to get people talking.
        </p>
      </div>
      <div
        className="category-tabs"
        role="group"
        aria-label="Question category"
      >
        {["all", ...categories].map((c) => (
          <button
            key={c}
            aria-pressed={filter === c}
            className={filter === c ? "active" : ""}
            onClick={() => setFilter(c)}
          >
            <span>{categoryIcons[c]}</span>
            {c === "all" ? "All questions" : title(c)}
          </button>
        ))}
      </div>
      <label className="candidate-search">
        <Search size={18} />
        <input
          aria-label="Search questions"
          placeholder="Find a little inspiration…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <div className="question-library">
        {selected.map((q) => (
          <article key={q.id}>
            <span className="eyebrow">
              {categoryIcons[q.category]} {q.category}
            </span>
            <h2>{q.text}</h2>
            {q.category === "custom" && custom.some((c) => c.id === q.id) && (
              <button
                className="delete-question"
                aria-label={`Delete ${q.text}`}
                onClick={() => {
                  const next = custom.filter((c) => c.id !== q.id);
                  setCustom(next);
                  localStorage.setItem(
                    "eleven-custom",
                    JSON.stringify(
                      readSavedQuestions().filter((c) => c.id !== q.id),
                    ),
                  );
                }}
              >
                <Trash2 size={16} />
              </button>
            )}
          </article>
        ))}
      </div>
      {selected.length === 0 && (
        <p className="empty-friends">
          No questions here yet. Make one your own below.
        </p>
      )}
      <section className="panel question-editor">
        <div>
          <span className="eyebrow">THE BEST ONES ARE PERSONAL</span>
          <h2>Write your own plot twist.</h2>
          <p>Keep it kind. Keep it curious. Keep it very you.</p>
        </div>
        <form onSubmit={add}>
          <label htmlFor="new-question">Your questions</label>
          <textarea
            id="new-question"
            maxLength={20000}
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              "Who’s most likely to…?\nPaste a whole list — one per line, or each ending with “?”"
            }
            aria-describedby="new-question-hint"
          />
          <p id="new-question-hint" className="fine">
            {count > 1
              ? `${count} questions found.`
              : "Tip: paste a whole list at once. Each line or “?” becomes its own question."}
          </p>
          <label className="check-label">
            <input
              type="checkbox"
              checked={save}
              onChange={(e) => setSave(e.target.checked)}
            />{" "}
            Save on this device
          </label>
          <Button type="submit" disabled={!count}>
            <Plus size={16} /> Add{" "}
            {count > 1 ? `${count} questions` : "question"}
            {live ? " to live room" : ""}
          </Button>
          {notice && (
            <p className="fine" role="status">
              {notice}
            </p>
          )}
        </form>
      </section>
      {!game.state && (
        <div className="center cta">
          <Button asChild>
            <Link to="/">
              Bring these to your people <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
      )}
    </main>
  );
}
