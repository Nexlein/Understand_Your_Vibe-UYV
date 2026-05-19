import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  DefenseOutputSchema,
  PerQuestionScoreSchema,
  ProsecutionOutputSchema,
  QuestionsOutputSchema,
  VerdictOutputSchema,
} from "@/lib/schemas";
import { QuizForm } from "@/components/quiz-form";

export const dynamic = "force-dynamic";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const id = parseInt(sessionId, 10);
  if (isNaN(id)) notFound();

  const session = await db.quizSession.findUnique({
    where: { id },
    include: {
      pullRequest: {
        include: { trials: { orderBy: { createdAt: "desc" }, take: 1 } },
      },
    },
  });

  if (!session) notFound();

  const trial = session.pullRequest.trials[0];
  if (!trial) {
    return (
      <main style={{ padding: "2rem" }}>
        <h1>Trial in progress...</h1>
        <p>The AI is analyzing this PR. Refresh in a few moments.</p>
      </main>
    );
  }

  const defense = DefenseOutputSchema.parse(JSON.parse(trial.defense));
  const prosecution = ProsecutionOutputSchema.parse(JSON.parse(trial.prosecution));
  const questions = QuestionsOutputSchema.parse(JSON.parse(trial.questions));
  const verdict = VerdictOutputSchema.parse(JSON.parse(trial.verdict));

  const initialPerQuestion = session.perQuestion
    ? z.array(PerQuestionScoreSchema).parse(JSON.parse(session.perQuestion))
    : null;

  const pr = session.pullRequest;

  return (
    <main style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>⚖️ Code Tribunal</h1>
      <h2>{pr.title}</h2>
      <p>
        {pr.repoFullName} — PR #{pr.prNumber} by @{pr.authorLogin}
      </p>

      <div
        style={{
          background: "#f9f5eb",
          border: "1px solid #d1b96a",
          borderRadius: "8px",
          padding: "1rem",
          margin: "1rem 0",
        }}
      >
        <strong>Verdict:</strong> {verdict.recommendation} — Risk {verdict.risk_score}/10
        <p>{verdict.summary}</p>
      </div>

      <div style={{ display: "flex", gap: "1.5rem", marginTop: "1.5rem" }}>
        <div
          style={{
            flex: 1,
            background: "#e8edf8",
            border: "1px solid #6b82c2",
            borderRadius: "8px",
            padding: "1rem",
          }}
        >
          <h3>🛡️ Defense</h3>
          <p style={{ fontStyle: "italic" }}>{defense.design_intent}</p>
          {defense.strengths.map((s, i) => (
            <div key={i} style={{ marginTop: "0.75rem" }}>
              <strong>{s.title}</strong>
              <p>{s.explanation}</p>
              {s.line_references.length > 0 && (
                <p style={{ color: "#6b7280", fontSize: "0.8rem" }}>
                  {s.line_references.join(", ")}
                </p>
              )}
            </div>
          ))}
          <p style={{ marginTop: "1rem", fontStyle: "italic", color: "#374151" }}>
            {defense.defense_summary}
          </p>
        </div>

        <div
          style={{
            flex: 1,
            background: "#f8e8e8",
            border: "1px solid #c26b6b",
            borderRadius: "8px",
            padding: "1rem",
          }}
        >
          <h3>⚔️ Prosecution</h3>
          {prosecution.concerns.map((c, i) => (
            <div key={i} style={{ marginTop: "0.75rem" }}>
              <strong>
                [{c.severity.toUpperCase()}] {c.title}
              </strong>
              <p>{c.explanation}</p>
              {c.line_references.length > 0 && (
                <p style={{ color: "#6b7280", fontSize: "0.8rem" }}>
                  {c.line_references.join(", ")}
                </p>
              )}
            </div>
          ))}
          <p style={{ marginTop: "1rem", fontStyle: "italic", color: "#374151" }}>
            {prosecution.prosecution_summary}
          </p>
        </div>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <h3>📋 Prove Your Understanding</h3>
        <p>Answer all questions correctly (≥ 70/100) to unlock the merge button.</p>
        <QuizForm
          sessionId={id}
          questions={questions.items}
          initialPassed={session.passed}
          initialScore={session.understandScore}
          initialPerQuestion={initialPerQuestion}
        />
      </div>
    </main>
  );
}
