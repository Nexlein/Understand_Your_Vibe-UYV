from pathlib import Path

from llm import get_client, MODELS
from schemas import EvaluateResponse, QuestionRef


async def run_evaluator(questions: list[QuestionRef], answers: list[str]) -> EvaluateResponse:
    prompt = (Path(__file__).parent.parent / "prompts" / "evaluator.md").read_text()

    qa_pairs = "\n\n".join(
        f"Q{i + 1} (id={q.id}): {q.text}\n"
        f"Expected concepts: {', '.join(q.expected_concepts)}\n"
        f"Developer answer: {answers[i] if i < len(answers) else '(no answer provided)'}"
        for i, q in enumerate(questions)
    )

    response = await get_client().beta.chat.completions.parse(
        model=MODELS.EVALUATOR,
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": qa_pairs},
        ],
        response_format=EvaluateResponse,
    )

    result = response.choices[0].message.parsed
    if result is None:
        raise ValueError("Evaluator agent returned no structured output")
    return result
