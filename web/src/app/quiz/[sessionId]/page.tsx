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
import { VerdictCard } from "@/components/verdict-card";
import { PerspectiveColumn } from "@/components/perspective-column";

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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          padding: "4rem 2rem",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⚖️</p>
        <h2 style={{ color: "var(--ct-ink)", marginBottom: "0.5rem" }}>Trial in progress…</h2>
        <p style={{ color: "var(--ct-muted)" }}>
          AI agents are analyzing this PR. Refresh in a few moments.
        </p>
      </div>
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
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "0.25rem" }}>
        <a
          href="/dashboard"
          style={{
            fontSize: "0.8rem",
            color: "var(--ct-muted)",
            textDecoration: "none",
          }}
        >
          ← Dashboard
        </a>
      </div>
      <h1 style={{ marginBottom: "0.25rem", fontSize: "1.75rem" }}>⚖️ Code Tribunal</h1>
      <p style={{ color: "var(--ct-muted)", marginBottom: "0", fontSize: "0.9375rem" }}>
        <strong style={{ color: "var(--ct-ink)" }}>{pr.title}</strong>
        &nbsp;·&nbsp;{pr.repoFullName}&nbsp;·&nbsp;PR #{pr.prNumber}&nbsp;·&nbsp;
        <a
          href={`https://github.com/${pr.repoFullName}/pull/${pr.prNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--ct-navy)" }}
        >
          @{pr.authorLogin} ↗
        </a>
      </p>

      {/* Verdict */}
      <VerdictCard verdict={verdict} />

      {/* Defense + Prosecution */}
      <div style={{ display: "flex", gap: "1.25rem", marginTop: "0.5rem" }}>
        <PerspectiveColumn
          variant="defense"
          design_intent={defense.design_intent}
          strengths={defense.strengths}
          defense_summary={defense.defense_summary}
        />
        <PerspectiveColumn
          variant="prosecution"
          concerns={prosecution.concerns}
          attack_vectors={prosecution.attack_vectors}
          prosecution_summary={prosecution.prosecution_summary}
        />
      </div>

      {/* Quiz */}
      <div
        style={{
          marginTop: "2.5rem",
          paddingTop: "2rem",
          borderTop: "1px solid #e2d9c8",
        }}
      >
        <h2 style={{ marginBottom: "0.5rem", fontSize: "1.375rem" }}>
          📋 Prove your understanding
        </h2>
        <p style={{ color: "var(--ct-muted)", marginBottom: "1.75rem", fontSize: "0.9375rem" }}>
          Answer the {questions.items.length} questions below.
          A score ≥ 70/100 unlocks the merge.
        </p>
        <QuizForm
          sessionId={id}
          questions={questions.items}
          initialPassed={session.passed}
          initialScore={session.understandScore}
          initialPerQuestion={initialPerQuestion}
        />
      </div>
    </div>
  );
}
