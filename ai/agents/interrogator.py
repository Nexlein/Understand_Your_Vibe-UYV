from pathlib import Path

from llm import get_client, MODELS
from schemas import QuestionsOutput


async def run_interrogator(diff: str, language: str) -> QuestionsOutput:
    prompt = (Path(__file__).parent.parent / "prompts" / "interrogator.md").read_text()

    response = await get_client().beta.chat.completions.parse(
        model=MODELS.INTERROGATOR,
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": f"Language: {language}\n\nDiff:\n{diff}"},
        ],
        response_format=QuestionsOutput,
    )

    result = response.choices[0].message.parsed
    if result is None:
        raise ValueError("Interrogator agent returned no structured output")
    return result
