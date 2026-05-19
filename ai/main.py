import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / "web" / ".env.local")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from agents.defense import run_defense
from agents.evaluator import run_evaluator
from agents.interrogator import run_interrogator
from agents.judge import run_judge
from agents.prosecution import run_prosecution
from schemas import EvaluateRequest, EvaluateResponse, TrialRequest, TrialResponse

app = FastAPI(title="Code Tribunal AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST"],
    allow_headers=["*"],
)


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not configured")
    return {"status": "ok"}


@app.post("/api/trial", response_model=TrialResponse)
async def run_trial(request: TrialRequest) -> TrialResponse:
    results = await asyncio.gather(
        run_defense(request.diff, request.language),
        run_prosecution(request.diff, request.language),
        run_interrogator(request.diff, request.language),
        return_exceptions=True,
    )
    errors = [r for r in results if isinstance(r, Exception)]
    if errors:
        raise HTTPException(status_code=502, detail=f"Agent error: {errors[0]}") from errors[0]
    defense, prosecution, questions = results  # type: ignore[misc]

    try:
        verdict = await run_judge(defense, prosecution, questions)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Judge error: {e}") from e

    return TrialResponse(
        defense=defense,
        prosecution=prosecution,
        questions=questions,
        verdict=verdict,
    )


@app.post("/api/evaluate", response_model=EvaluateResponse)
async def evaluate_answers(request: EvaluateRequest) -> EvaluateResponse:
    if len(request.answers) != len(request.questions):
        raise HTTPException(
            status_code=422,
            detail=f"Expected {len(request.questions)} answers, got {len(request.answers)}",
        )
    try:
        return await run_evaluator(request.questions, request.answers)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Evaluator error: {e}") from e
