import json
from typing import List, Dict, Any
from models import QuerySummary
from providers import LLMProvider

QUERY_UNDERSTANDING_SYSTEM_PROMPT = """You are a Query Understanding Agent for a global market intelligence system.

Your task: Parse the user's natural language query into a structured JSON object.

RULES:
- topic: The specific product, industry, or market being queried (e.g. "electric vehicles", "car spare parts", "semiconductor chips")
- region: The geographic scope. Use one of: Southeast Asia, East Asia, South Asia, Asia Pacific, Middle East, Europe, North America, Latin America, Africa, Global. Match the user's intent precisely.
- intent: One of: market_exploration | competitive_analysis | investment_research | supply_chain_analysis | regulatory_overview
- informationNeeded: Array of 3-5 specific data points the user likely needs (e.g. ["market size", "key competitors", "import/export volumes"])
- searchHints: Array of 4-6 specific search terms to find relevant news (combine topic + region + related keywords, e.g. ["EV sales Southeast Asia", "electric vehicle Thailand Vietnam"])

Output ONLY valid JSON with exactly these keys: topic, region, intent, informationNeeded, searchHints."""

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
