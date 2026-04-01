import json
from typing import List, Dict, Any
from models import QuerySummary
from providers import LLMProvider

QUERY_UNDERSTANDING_SYSTEM_PROMPT = """You are a Query Understanding Agent.
Your job is to parse the user's input into a JSON structure containing:
- topic
- region
- intent
- informationNeeded
- searchHints

Always output valid JSON."""

class QueryUnderstandingAgent:
    def __init__(self, provider: LLMProvider):
        self.provider = provider

    def build_prompt(self, query: str) -> List[Dict[str, str]]:
        return [
            {
                "role": "system",
                "content": QUERY_UNDERSTANDING_SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": f"Parse this user query into structured JSON.\nQuery: {query}"
            }
        ]

    async def run(self, query: str) -> QuerySummary:
        normalized_query = query.strip()
        if not normalized_query:
            raise ValueError("QueryUnderstandingAgent: query is required")

        messages = self.build_prompt(normalized_query)

        # Call the LLM provider
        raw_dict = await self.provider.generate_json(
            messages=messages,
            temperature=0.0,
            max_tokens=500
        )

        # Apply fallbacks
        topic = raw_dict.get('topic', '').strip() or 'General market exploration'
        region = raw_dict.get('region', '').strip() or 'Global'
        intent = raw_dict.get('intent', '').strip() or 'market_exploration'
        
        information_needed = raw_dict.get('informationNeeded')
        if not isinstance(information_needed, list) or len(information_needed) == 0:
            information_needed = ['market insights', 'recent developments']
            
        search_hints = raw_dict.get('searchHints')
        if not isinstance(search_hints, list) or len(search_hints) == 0:
            search_hints = list(dict.fromkeys([
                f"{topic} {region} market insights",
                f"{topic} {region} recent developments",
                normalized_query
            ]))

        # Validate and return Pydantic schema
        return QuerySummary(
            topic=topic,
            region=region,
            intent=intent,
            informationNeeded=information_needed,
            searchHints=search_hints
        )
