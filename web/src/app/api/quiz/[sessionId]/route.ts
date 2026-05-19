import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { runEvaluation } from "@/lib/ai-service";
import { setCommitStatus } from "@/lib/github/status";
import { postQuizResultComment } from "@/lib/github/comment";
import { QuestionsOutputSchema, PerQuestionScoreSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

async function getSession(sessionId: string) {
  const id = parseInt(sessionId, 10);
  if (isNaN(id)) return null;
  return db.quizSession.findUnique({
    where: { id },
    include: {
      pullRequest: {
        include: { trials: { orderBy: { createdAt: "desc" }, take: 1 } },
      },
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = await getSession(sessionId);

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const trial = session.pullRequest.trials[0];
  if (!trial) return NextResponse.json({ error: "Trial not ready yet" }, { status: 404 });

  return NextResponse.json({
    session: {
      id: session.id,
      passed: session.passed,
      understandScore: session.understandScore,
      perQuestion: session.perQuestion
        ? z.array(PerQuestionScoreSchema).parse(JSON.parse(session.perQuestion))
        : null,
    },
    trial: {
      defense: JSON.parse(trial.defense),
      prosecution: JSON.parse(trial.prosecution),
      questions: JSON.parse(trial.questions),
      verdict: JSON.parse(trial.verdict),
    },
    pr: {
      repoFullName: session.pullRequest.repoFullName,
      prNumber: session.pullRequest.prNumber,
      title: session.pullRequest.title,
      authorLogin: session.pullRequest.authorLogin,
    },
  });
}

const SubmitSchema = z.object({
  answers: z.array(z.string()).min(1).max(10),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = await getSession(sessionId);

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const trial = session.pullRequest.trials[0];
  if (!trial) return NextResponse.json({ error: "Trial not ready yet" }, { status: 404 });

  const parsed = SubmitSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 422 });

  const questions = QuestionsOutputSchema.parse(JSON.parse(trial.questions));

  const evaluation = await runEvaluation({
    questions: questions.items,
    answers: parsed.data.answers,
  });

  await db.quizSession.update({
    where: { id: session.id },
    data: {
      answers: JSON.stringify(parsed.data.answers),
      understandScore: evaluation.understanding_score,
      perQuestion: JSON.stringify(evaluation.per_question),
      passed: evaluation.passed,
    },
  });

  if (evaluation.passed) {
    await db.pullRequest.update({
      where: { id: session.pullRequestId },
      data: { status: "approved" },
    });

    await setCommitStatus({
      installationId: session.pullRequest.installationId,
      repoFullName: session.pullRequest.repoFullName,
      sha: session.pullRequest.headSha,
      state: "success",
      description: `Code Tribunal: understanding verified (${evaluation.understanding_score}/100)`,
    });
  }

  // Post result comment on PR — fire-and-forget, ne bloque pas la réponse
  void postQuizResultComment({
    installationId: session.pullRequest.installationId,
    repoFullName: session.pullRequest.repoFullName,
    prNumber: session.pullRequest.prNumber,
    authorLogin: session.pullRequest.authorLogin,
    evaluation,
  }).catch((err: unknown) =>
    console.error("[quiz] Failed to post result comment:", err)
  );

  return NextResponse.json(evaluation);
}
