import os
import json
from typing import List, Dict, Any
from models import QuerySummary
from openai import AsyncOpenAI

class LLMProvider:
    def __init__(self):
        # We use openai SDK pointing to GROQ
        groq_api_key = os.environ.get("GROQ_API_KEY")
        if not groq_api_key:
            # We don't raise error immediately to not break instantiation if someone wants to mock
            self.client = None
        else:
            self.client = AsyncOpenAI(
                api_key=groq_api_key,
                base_url="https://api.groq.com/openai/v1"
            )

    async def generate_json(self, messages: List[Dict[str, str]], temperature: float = 0.0, max_tokens: int = 1000) -> Any:
        if not self.client:
            raise RuntimeError("GROQ_API_KEY is not set.")
            
        response = await self.client.chat.completions.create(
            model="llama-3.1-8b-instant",  # Example Groq model
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        return json.loads(content)
