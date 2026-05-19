"use client";

import { useState } from "react";
import type { EvaluateResponse, PerQuestionScore, Question } from "@/lib/schemas";

type Props = {
  sessionId: number;
  questions: Question[];
  initialPassed?: boolean | null;
  initialScore?: number | null;
  initialPerQuestion?: PerQuestionScore[] | null;
};

export function QuizForm({
  sessionId,
  questions,
  initialPassed,
  initialScore,
  initialPerQuestion,
}: Props) {
  const [answers, setAnswers] = useState<string[]>(questions.map(() => ""));
  const [result, setResult] = useState<EvaluateResponse | null>(
    initialPassed != null && initialScore != null && initialPerQuestion != null
      ? { understanding_score: initialScore, per_question: initialPerQuestion, passed: initialPassed }
      : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/quiz/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Submission failed");
        return;
      }

      const data = (await res.json()) as EvaluateResponse;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div>
        <h3>{result.passed ? "✓ Understanding Verified" : "✗ Score insufficient"}</h3>
        <p>
          Score: <strong>{result.understanding_score}/100</strong>
          {result.passed ? " — merge unlocked" : " — 70/100 required"}
        </p>
        <div>
          {result.per_question.map((q) => (
            <div key={q.question_id} style={{ marginBottom: "1rem" }}>
              <strong>
                Q{q.question_id}: {q.score}/100
              </strong>
              <p>{q.feedback}</p>
              {q.missing_concepts.length > 0 && (
                <p style={{ color: "#b45309" }}>
                  Missing concepts: {q.missing_concepts.join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
        {!result.passed && (
          <button onClick={() => setResult(null)}>Try Again</button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {questions.map((q, i) => (
        <div key={q.id} style={{ marginBottom: "1.5rem" }}>
          <label>
            <strong>
              Q{i + 1}: {q.text}
            </strong>
          </label>
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Topic: {q.topic}</p>
          <textarea
            value={answers[i]}
            onChange={(e) => {
              const next = [...answers];
              next[i] = e.target.value;
              setAnswers(next);
            }}
            rows={4}
            placeholder="Your answer..."
            required
            style={{ width: "100%", marginTop: "0.5rem" }}
          />
        </div>
      ))}
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Evaluating..." : "Submit Answers"}
      </button>
    </form>
  );
}
