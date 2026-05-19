import { z } from "zod";

// --- Defense ---

export const StrengthSchema = z.object({
  title: z.string(),
  explanation: z.string(),
  line_references: z.array(z.string()),
  file_paths: z.array(z.string()),
});

export const DefenseOutputSchema = z.object({
  strengths: z.array(StrengthSchema),
  design_intent: z.string(),
  defense_summary: z.string(),
});

// --- Prosecution ---

export const ConcernSchema = z.object({
  title: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  explanation: z.string(),
  line_references: z.array(z.string()),
  file_paths: z.array(z.string()),
});

export const ProsecutionOutputSchema = z.object({
  concerns: z.array(ConcernSchema),
  attack_vectors: z.array(z.string()),
  prosecution_summary: z.string(),
});

// --- Interrogator ---

export const QuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  topic: z.string(),
  expected_concepts: z.array(z.string()),
});

export const QuestionsOutputSchema = z.object({
  items: z.array(QuestionSchema),
});

// --- Judge ---

export const VerdictOutputSchema = z.object({
  risk_score: z.number(),
  recommendation: z.enum(["approve", "request_changes", "needs_understanding_proof"]),
  summary: z.string(),
});

// --- Trial response ---

export const TrialResponseSchema = z.object({
  defense: DefenseOutputSchema,
  prosecution: ProsecutionOutputSchema,
  questions: QuestionsOutputSchema,
  verdict: VerdictOutputSchema,
});

// --- Evaluate ---

export const PerQuestionScoreSchema = z.object({
  question_id: z.string(),
  score: z.number().int(),
  feedback: z.string(),
  missing_concepts: z.array(z.string()),
});

export const EvaluateResponseSchema = z.object({
  understanding_score: z.number().int(),
  per_question: z.array(PerQuestionScoreSchema),
  passed: z.boolean(),
});

// --- Inferred types ---

export type Strength = z.infer<typeof StrengthSchema>;
export type DefenseOutput = z.infer<typeof DefenseOutputSchema>;
export type Concern = z.infer<typeof ConcernSchema>;
export type ProsecutionOutput = z.infer<typeof ProsecutionOutputSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type QuestionsOutput = z.infer<typeof QuestionsOutputSchema>;
export type VerdictOutput = z.infer<typeof VerdictOutputSchema>;
export type TrialResponse = z.infer<typeof TrialResponseSchema>;
export type PerQuestionScore = z.infer<typeof PerQuestionScoreSchema>;
export type EvaluateResponse = z.infer<typeof EvaluateResponseSchema>;
