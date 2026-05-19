import { env } from "@/lib/env";
import {
  EvaluateResponseSchema,
  TrialResponseSchema,
  type EvaluateResponse,
  type Question,
  type TrialResponse,
} from "@/lib/schemas";

export async function runTrial(params: {
  diff: string;
  repoFullName: string;
  prNumber: number;
  language?: string;
}): Promise<TrialResponse> {
  const res = await fetch(`${env.AI_SERVICE_URL}/api/trial`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      diff: params.diff,
      repo_full_name: params.repoFullName,
      pr_number: params.prNumber,
      language: params.language ?? "unknown",
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`AI service /api/trial failed (${res.status}): ${detail}`);
  }

  return TrialResponseSchema.parse(await res.json());
}

export async function runEvaluation(params: {
  questions: Question[];
  answers: string[];
}): Promise<EvaluateResponse> {
  const res = await fetch(`${env.AI_SERVICE_URL}/api/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      questions: params.questions.map((q) => ({
        id: q.id,
        text: q.text,
        expected_concepts: q.expected_concepts,
      })),
      answers: params.answers,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`AI service /api/evaluate failed (${res.status}): ${detail}`);
  }

  return EvaluateResponseSchema.parse(await res.json());
}
