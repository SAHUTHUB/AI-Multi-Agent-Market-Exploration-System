import os
import json
import aiohttp
from typing import List, Dict, Any
from models import QuerySummary

class LLMProvider:
    def __init__(self):
        self.api_key = os.environ.get("GROQ_API_KEY")
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"

    async def generate_json(self, messages: List[Dict[str, str]], temperature: float = 0.0, max_tokens: int = 1000) -> Any:
        if not self.api_key:
            raise RuntimeError("GROQ_API_KEY is not set.")
            
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "llama-3.1-8b-instant",
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "response_format": {"type": "json_object"}
        }
        
        async with aiohttp.ClientSession(connector=aiohttp.TCPConnector(ssl=False)) as session:
            async with session.post(self.api_url, headers=headers, json=payload) as response:
                if response.status != 200:
                    text_err = await response.text()
                    raise RuntimeError(f"Groq API Error: {response.status} - {text_err}")
                    
                data = await response.json()
                content = data["choices"][0]["message"]["content"]
                return json.loads(content)
