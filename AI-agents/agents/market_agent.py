import json
from typing import List, Dict, Any, Optional
from models import QuerySummary, MarketContext, MarketDataRecord, EvidenceRecord
from providers import LLMProvider
from tools import MarketDataTool

MARKET_RESEARCH_SYSTEM_PROMPT = """You are a Market Research Agent specializing in global trade intelligence.

Your task: Analyze the provided market data records and produce a SPECIFIC, DATA-DRIVEN market context.

STRICT RULES:
1. keyMarkets MUST list ONLY countries that are geographically inside the given Region. Never include countries outside the region.
2. overview MUST reference specific countries, sectors, or trends from the provided records. Do NOT write generic filler like "growing interest" or "high adoption rate" — use actual data.
3. industryContext MUST contain 4-6 distinct, specific insights derived from the overviewPoints and industrySignals in the records. Each insight must be a complete, informative sentence.
4. All output must be grounded in the data provided. If data is sparse, acknowledge it specifically.

Output ONLY valid JSON with keys: overview (string), keyMarkets (array of country name strings), industryContext (array of strings)."""

class MarketResearchAgent:
    def __init__(self, provider: LLMProvider, market_data_tool: MarketDataTool):
        self.provider = provider
        self.market_data_tool = market_data_tool

    def build_prompt(self, query_summary: QuerySummary, records: List[MarketDataRecord]) -> List[Dict[str, str]]:
        records_dict = [r.model_dump() for r in records]
        return [
            {
                "role": "system",
                "content": MARKET_RESEARCH_SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": "\n\n".join([
                    "Build a market context summary from the data below.",
                    f"Topic: {query_summary.topic}",
                    f"Region: {query_summary.region}",
                    f"Intent: {query_summary.intent}",
                    f"Information needed: {', '.join(query_summary.informationNeeded)}",
                    "Market source records:",
                    json.dumps(records_dict, indent=2)
                ])
            }
        ]
        
    def _build_fallback_overview(self, records: List[MarketDataRecord], topic: str, region: str) -> str:
        if not records:
            return f"No structured market data was found for {topic} in {region}."
        countries = list(dict.fromkeys([r.country for r in records if r.country]))
        return f"{region} shows relevant market activity for {topic}, with notable context across {', '.join(countries)}."

    def _build_fallback_industry_context(self, records: List[MarketDataRecord]) -> List[str]:
        merged = []
        for item in records:
            merged.extend(item.overviewPoints)
            merged.extend(item.industrySignals)
        unique_merged = list(dict.fromkeys(filter(None, merged)))
        return unique_merged[:6]

    async def run(self, query_summary: QuerySummary) -> MarketContext:
        records = await self.market_data_tool.load_market_data(
            topic=query_summary.topic,
            region=query_summary.region,
            search_hints=query_summary.searchHints
        )

        def normalize(raw: Optional[Dict[str, Any]]) -> MarketContext:
            if raw is None:
                raw = {}

            # Fallbacks
            fallback_overview = self._build_fallback_overview(records, query_summary.topic, query_summary.region)
            
            raw_key_markets = raw.get('keyMarkets', [])
            if raw_key_markets and isinstance(raw_key_markets, list):
                key_markets = list(dict.fromkeys([str(k).strip() for k in raw_key_markets if k]))
            else:
                key_markets = list(dict.fromkeys([r.country for r in records if r.country]))
                
            raw_industry_context = raw.get('industryContext', [])
            if raw_industry_context and isinstance(raw_industry_context, list):
                industry_context = [str(k).strip() for k in raw_industry_context if k]
            else:
                industry_context = self._build_fallback_industry_context(records)

            overview = str(raw.get('overview', '')).strip() or fallback_overview
            
            evidence = [
                EvidenceRecord(country=r.country, source=r.source)
                for r in records
            ]

            return MarketContext(
                overview=overview,
                keyMarkets=key_markets,
                industryContext=industry_context,
                evidence=evidence
            )

        if not records:
            return normalize({})

        messages = self.build_prompt(query_summary, records)

        raw_dict = await self.provider.generate_json(
            messages=messages,
            temperature=0.0,
            max_tokens=700
        )

        return normalize(raw_dict) 
