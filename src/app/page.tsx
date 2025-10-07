"use client";
import { useState } from "react";

type Utterance = { role: string; content: string };

type DebateResult = { transcript: Utterance[]; summary: string };

export default function Page() {
  const [idea, setIdea] = useState("");
  const [rounds, setRounds] = useState(2);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DebateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/discuss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, rounds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Error ${res.status}`);
      }
      const data: DebateResult = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Multi-Agent: Product Workshop</h1>
      <p style={{ color: "#555", marginBottom: 24 }}>
        Enter an idea. Five agents (Developer, Designer, Project Manager, Product Manager, and Business Director) debate, and a Moderator synthesizes a plan.
      </p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginBottom: 24 }}>
        <label>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Idea</div>
          <textarea
            required
            minLength={10}
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={5}
            placeholder="E.g.: An app that connects seniors with mentors to learn digital skills."
            style={{ width: "100%", padding: 12, fontSize: 14 }}
          />
        </label>
        <label>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Rounds</div>
          <input
            type="number"
            min={1}
            max={5}
            value={rounds}
            onChange={(e) => setRounds(Number(e.target.value))}
            style={{ width: 100, padding: 8 }}
          />
        </label>
        <button disabled={loading} style={{ padding: "10px 14px", fontWeight: 600 }}>
          {loading ? "Running debate…" : "Run debate"}
        </button>
      </form>

      {error && (
        <div style={{ color: "#b00020", marginBottom: 16 }}>Error: {error}</div>
      )}

      {result && (
        <section style={{ display: "grid", gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Transcript</h2>
            <div style={{ whiteSpace: "pre-wrap", background: "#fafafa", padding: 12, border: "1px solid #eee" }}>
              {result.transcript.map((u, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <strong>{u.role}:</strong> {u.content}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Moderator Summary</h2>
            <div style={{ whiteSpace: "pre-wrap", background: "#f5fbff", padding: 12, border: "1px solid #e1f0ff" }}>
              {result.summary}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}