import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { useGame, title } from "../components/shared";
import { session } from "../network/session";
import { categories, questionSchema, type Question } from "../game/types";
import { questions, readSavedQuestions } from "../data/questions";
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
  function add(e: FormEvent) {
    e.preventDefault();
    const q = {
      id: crypto.randomUUID(),
      category: "custom" as const,
      text: text.trim(),
    };
    if (!questionSchema.safeParse(q).success) return;
    setCustom((c) => [...c, q]);
    if (save)
      localStorage.setItem(
        "eleven-custom",
        JSON.stringify([...readSavedQuestions(), q].slice(-200)),
      );
    if (game.isHost && game.state) session.custom(q);
    setText("");
    setNotice(
      game.isHost && game.state
        ? "Added to your live room."
        : save
          ? "Saved on this device."
          : "Added for this visit. Enable saving to keep it.",
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
          <label htmlFor="new-question">Your question</label>
          <textarea
            id="new-question"
            minLength={8}
            maxLength={240}
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Who’s most likely to…"
          />
          <label className="check-label">
            <input
              type="checkbox"
              checked={save}
              onChange={(e) => setSave(e.target.checked)}
            />{" "}
            Save on this device
          </label>
          <Button type="submit" disabled={text.trim().length < 8}>
            <Plus size={16} /> Add question
            {game.isHost && game.state ? " to live room" : ""}
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
