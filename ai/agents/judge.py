from pathlib import Path

from llm import get_client, MODELS
from schemas import DefenseOutput, ProsecutionOutput, QuestionsOutput, VerdictOutput


async def run_judge(
    defense: DefenseOutput,
    prosecution: ProsecutionOutput,
    questions: QuestionsOutput,
) -> VerdictOutput:
    prompt = (Path(__file__).parent.parent / "prompts" / "judge.md").read_text()

    context = f"""Defense analysis:
{defense.model_dump_json(indent=2)}

Prosecution analysis:
{prosecution.model_dump_json(indent=2)}

Questions generated:
{questions.model_dump_json(indent=2)}"""

    response = await get_client().beta.chat.completions.parse(
        model=MODELS.JUDGE,
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": context},
        ],
        response_format=VerdictOutput,
    )

    result = response.choices[0].message.parsed
    if result is None:
        raise ValueError("Judge agent returned no structured output")
    return result
