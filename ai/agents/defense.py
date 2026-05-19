from pathlib import Path

from llm import get_client, MODELS
from schemas import DefenseOutput


async def run_defense(diff: str, language: str) -> DefenseOutput:
    prompt = (Path(__file__).parent.parent / "prompts" / "defense.md").read_text()

    response = await get_client().beta.chat.completions.parse(
        model=MODELS.DEFENSE,
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": f"Language: {language}\n\nDiff:\n{diff}"},
        ],
        response_format=DefenseOutput,
    )

    result = response.choices[0].message.parsed
    if result is None:
        raise ValueError("Defense agent returned no structured output")
    return result
