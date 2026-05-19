from pathlib import Path

from llm import get_client, MODELS
from schemas import ProsecutionOutput


async def run_prosecution(diff: str, language: str) -> ProsecutionOutput:
    prompt = (Path(__file__).parent.parent / "prompts" / "prosecution.md").read_text()

    response = await get_client().beta.chat.completions.parse(
        model=MODELS.PROSECUTION,
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": f"Language: {language}\n\nDiff:\n{diff}"},
        ],
        response_format=ProsecutionOutput,
    )

    result = response.choices[0].message.parsed
    if result is None:
        raise ValueError("Prosecution agent returned no structured output")
    return result
