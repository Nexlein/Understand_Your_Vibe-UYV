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
  const initialResult: EvaluateResponse | null =
    initialPassed != null && initialScore != null && initialPerQuestion != null
      ? { understanding_score: initialScore, per_question: initialPerQuestion, passed: initialPassed }
      : null;

  const [answers, setAnswers] = useState<string[]>(questions.map(() => ""));
  const [latestResult, setLatestResult] = useState<EvaluateResponse | null>(initialResult);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(initialResult ? 1 : 0);

  const passed = latestResult?.passed ?? false;

  async function submit() {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/quiz/${sessionId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ answers }),
      });

      let data: unknown;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Réponse non-JSON du serveur (HTTP ${res.status})`);
      }

      if (!res.ok) {
        const errData = data as { error?: string };
        setError(errData.error ?? `Erreur ${res.status}`);
        return;
      }

      const evaluation = data as EvaluateResponse;
      setLatestResult(evaluation);
      setAttemptCount((c) => c + 1);
      if (!evaluation.passed) {
        setAnswers(questions.map(() => ""));
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur réseau — vérifie que le service AI tourne (port 8000)"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Résultat de la dernière tentative — toujours visible */}
      {latestResult && (
        <div
          style={{
            marginBottom: "1.5rem",
            padding: "1.5rem",
            border: `2px solid ${latestResult.passed ? "#22c55e" : "#ef4444"}`,
            borderRadius: "8px",
            background: latestResult.passed ? "#f0fdf4" : "#fef2f2",
          }}
        >
          <h3 style={{ color: latestResult.passed ? "#16a34a" : "#dc2626", marginTop: 0 }}>
            {latestResult.passed
              ? "✓ Compréhension vérifiée"
              : `✗ Score insuffisant — tentative ${attemptCount}`}
          </h3>
          <p>
            Score : <strong>{latestResult.understanding_score}/100</strong>
            {latestResult.passed ? " — merge débloqué !" : " — 70/100 requis"}
          </p>

          {Array.isArray(latestResult.per_question) &&
            latestResult.per_question.map((q) => (
              <div
                key={q.question_id}
                style={{
                  marginTop: "0.75rem",
                  padding: "0.75rem",
                  background: "rgba(255,255,255,0.7)",
                  borderRadius: "4px",
                }}
              >
                <strong>
                  Q{q.question_id} : {q.score}/100
                </strong>
                <p style={{ margin: "0.25rem 0" }}>{q.feedback}</p>
                {q.missing_concepts.length > 0 && (
                  <p style={{ color: "#92400e", fontSize: "0.85rem", margin: 0 }}>
                    Concepts manquants : {q.missing_concepts.join(", ")}
                  </p>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Formulaire — visible tant que non réussi */}
      {!passed && (
        <>
          {latestResult && (
            <div
              style={{
                background: "#fff7ed",
                border: "1px solid #f59e0b",
                borderRadius: "6px",
                padding: "0.75rem 1rem",
                marginBottom: "1.5rem",
                color: "#92400e",
              }}
            >
              <strong>Nouvelle tentative</strong> — relis le feedback ci-dessus, corrige tes réponses et réessaie.
              Le détail de chaque tentative est aussi posté en commentaire sur la PR.
            </div>
          )}

          {questions.map((q, i) => (
            <div key={q.id} style={{ marginBottom: "1.75rem" }}>
              <label
                htmlFor={`q-${i}`}
                style={{ display: "block", marginBottom: "0.375rem" }}
              >
                <strong style={{ color: "var(--ct-ink, #1a1a2e)", fontSize: "0.9375rem" }}>
                  Q{i + 1} : {q.text}
                </strong>
              </label>
              <p
                style={{
                  color: "var(--ct-muted, #6b7280)",
                  fontSize: "0.8rem",
                  margin: "0 0 0.5rem",
                  fontStyle: "italic",
                }}
              >
                Topic : {q.topic}
              </p>
              <textarea
                id={`q-${i}`}
                value={answers[i]}
                onChange={(e) => {
                  const next = [...answers];
                  next[i] = e.target.value;
                  setAnswers(next);
                }}
                rows={5}
                placeholder="Ta réponse..."
                disabled={loading}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "0.75rem",
                  border: "1px solid #d1c9bb",
                  borderRadius: "6px",
                  background: "#fff",
                  fontSize: "0.9rem",
                  fontFamily: "inherit",
                  lineHeight: 1.6,
                  resize: "vertical",
                  color: "var(--ct-ink, #1a1a2e)",
                  opacity: loading ? 0.6 : 1,
                }}
              />
            </div>
          ))}

          {error && (
            <div
              style={{
                background: "#fee2e2",
                border: "1px solid #ef4444",
                borderRadius: "6px",
                padding: "0.75rem 1rem",
                marginBottom: "1rem",
                color: "#dc2626",
              }}
            >
              <strong>Erreur : </strong>
              {error}
            </div>
          )}

          <button
            type="button"
            className="ct-btn"
            onClick={() => void submit()}
            disabled={loading || answers.every((a) => a.trim() === "")}
          >
            {loading
              ? "Évaluation en cours…"
              : latestResult
                ? "Soumettre — nouvelle tentative"
                : "Soumettre mes réponses"}
          </button>
        </>
      )}
    </div>
  );
}
