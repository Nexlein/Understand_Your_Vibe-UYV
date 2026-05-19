from typing import Literal
from pydantic import BaseModel


# --- Defense ---


class Strength(BaseModel):
    title: str
    explanation: str
    line_references: list[str]
    file_paths: list[str]  # e.g. ["src/allocator.c", "include/arena.h"]


class DefenseOutput(BaseModel):
    strengths: list[Strength]
    design_intent: str
    defense_summary: str


# --- Prosecution ---


class Concern(BaseModel):
    title: str
    severity: Literal["low", "medium", "high", "critical"]
    explanation: str
    line_references: list[str]
    file_paths: list[str]  # e.g. ["src/allocator.c", "include/arena.h"]


class ProsecutionOutput(BaseModel):
    concerns: list[Concern]
    attack_vectors: list[str]
    prosecution_summary: str


# --- Interrogator ---


class Question(BaseModel):
    id: str
    text: str
    topic: str
    expected_concepts: list[str]


class QuestionsOutput(BaseModel):
    items: list[Question]


# --- Judge ---


class VerdictOutput(BaseModel):
    risk_score: float
    recommendation: Literal["approve", "request_changes", "needs_understanding_proof"]
    summary: str


# --- Evaluator ---


class PerQuestionScore(BaseModel):
    question_id: str
    score: int
    feedback: str
    missing_concepts: list[str]


# --- API contracts ---


class TrialRequest(BaseModel):
    diff: str
    repo_full_name: str
    pr_number: int
    language: str


class TrialResponse(BaseModel):
    defense: DefenseOutput
    prosecution: ProsecutionOutput
    questions: QuestionsOutput
    verdict: VerdictOutput


class QuestionRef(BaseModel):
    id: str
    text: str
    expected_concepts: list[str]


class EvaluateRequest(BaseModel):
    questions: list[QuestionRef]
    answers: list[str]


class EvaluateResponse(BaseModel):
    understanding_score: int
    per_question: list[PerQuestionScore]
    passed: bool
