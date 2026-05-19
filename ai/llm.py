from __future__ import annotations

import os
from functools import lru_cache

import httpx
from openai import AsyncOpenAI


@lru_cache(maxsize=1)
def get_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        api_key=os.getenv("OPENAI_API_KEY"),
        timeout=httpx.Timeout(60.0, connect=5.0),
        max_retries=1,
    )


class MODELS:
    INTERROGATOR = "gpt-5-chat-latest"
    DEFENSE = "gpt-5-chat-latest"
    PROSECUTION = "gpt-5-chat-latest"
    JUDGE = "gpt-5-chat-latest"
    EVALUATOR = "gpt-4.1-mini"
    DEV = "gpt-4.1-mini"
