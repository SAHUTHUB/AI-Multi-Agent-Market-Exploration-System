import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from models import (
    QuerySummary, 
    MarketContext, 
    ExternalSignalRecord, 
    EvidenceRecord,
    RecentDevelopment,
    SignalAnalysis,
    ImpactType,
    ConfidenceType
)
from providers import LLMProvider
from tools import SignalDataTool

NEWS_SIGNAL_SYSTEM_PROMPT = """You are a News Signal Analysis Agent.
Analyze the provided signals and market context.
Output JSON:
- recentDevelopments
- regionalSignals
- overallInsight"""

class NewsSignalAgent:
    def __init__(self, provider: LLMProvider, signal_data_tool: SignalDataTool):
        self.provider = provider
        self.signal_data_tool = signal_data_tool

    def build_prompt(self, query_summary: QuerySummary, market_context: MarketContext, records: List[ExternalSignalRecord]) -> List[Dict[str, str]]:
        records_dict = [r.model_dump() for r in records]
        market_context_dict = market_context.model_dump()
        return [
            {
                "role": "system",
                "content": NEWS_SIGNAL_SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": "\n\n".join([
                    "Analyze the provided regional signals.",
                    f"Topic: {query_summary.topic}",
                    f"Region: {query_summary.region}",
                    f"Intent: {query_summary.intent}",
                    f"Key markets: {', '.join(market_context.keyMarkets)}",
                    "Market context:",
                    json.dumps(market_context_dict, indent=2),
                    "Signal source records:",
                    json.dumps(records_dict, indent=2)
                ])
            }
        ]

    def _build_fallback_recent_developments(self, records: List[ExternalSignalRecord]) -> List[RecentDevelopment]:
        return [
            RecentDevelopment(
                market=item.country,
                headline=item.headline,
                summary=item.summary,
                impact=item.impact,
                confidence="medium",
                source=item.source,
                publishedAt=item.publishedAt
            ) for item in records
        ]

    def _build_fallback_regional_signals(self, records: List[ExternalSignalRecord]) -> List[str]:
        signals = [f"{item.country}: {item.headline} ({item.impact})" for item in records]
        return list(dict.fromkeys(signals))[:6]

    def _build_fallback_overall_insight(self, records: List[ExternalSignalRecord], query_summary: QuerySummary, market_context: MarketContext) -> str:
        if not records:
            return f"No significant external signals were found for {query_summary.topic} in {query_summary.region}."

        countries = list(dict.fromkeys([item.country for item in records if item.country]))
        markets_text = (", ".join(market_context.keyMarkets) if market_context.keyMarkets else ", ".join(countries))

        return f"{query_summary.region} shows active external developments relevant to {query_summary.topic}, especially across {markets_text}."

    async def run(self, query_summary: QuerySummary, market_context: MarketContext, data_sources: List[str]) -> SignalAnalysis:
        all_records: List[ExternalSignalRecord] = []

        for source in data_sources:
            if source == 'api':
                # Simplified mock for API
                target = []
            elif source == 'scrape':
                # Simplified mock for scrape
                target = []
            elif source == 'mock':
                target = await self.signal_data_tool.load_signals(
                    topic=query_summary.topic,
                    region=query_summary.region,
                    key_markets=market_context.keyMarkets,
                    search_hints=query_summary.searchHints
                )
            else:
                target = []
            all_records.extend(target)

        def normalize(raw: Optional[Dict[str, Any]]) -> SignalAnalysis:
            if raw is None:
                raw = {}

            fallback_rd = self._build_fallback_recent_developments(all_records)
            fallback_rs = self._build_fallback_regional_signals(all_records)
            fallback_oi = self._build_fallback_overall_insight(all_records, query_summary, market_context)

            # Extract recent developments
            raw_rd = raw.get("recentDevelopments", [])
            recent_developments = []
            if raw_rd and isinstance(raw_rd, list):
                for item in raw_rd:
                    if isinstance(item, dict):
                        recent_developments.append(RecentDevelopment(
                            market=str(item.get("market", "Unknown")).strip(),
                            headline=str(item.get("headline", "Untitled")).strip(),
                            summary=str(item.get("summary", "")).strip(),
                            impact=item.get("impact") if item.get("impact") in ('positive','negative','mixed','neutral') else 'neutral',
                            confidence=item.get("confidence") if item.get("confidence") in ('high','medium','low') else 'medium',
                            source=str(item.get("source", "Unknown")).strip(),
                            publishedAt=str(item.get("publishedAt", "Unknown")).strip()
                        ))
            if not recent_developments:
                recent_developments = fallback_rd

            # Extract regional signals
            raw_rs = raw.get("regionalSignals", [])
            regional_signals = [str(x).strip() for x in raw_rs if isinstance(x, str) and str(x).strip()] if isinstance(raw_rs, list) else fallback_rs
            if not regional_signals:
                regional_signals = fallback_rs

            # Extract overall insight
            overall_insight = str(raw.get("overallInsight", "")).strip() or fallback_oi

            # Evidence
            evidence = [
                EvidenceRecord(country=item.country, source=item.source, headline=item.headline)
                for item in all_records
            ]

            return SignalAnalysis(
                recentDevelopments=recent_developments,
                regionalSignals=regional_signals,
                overallInsight=overall_insight,
                evidence=evidence
            )

        if not all_records:
            return normalize({})

        messages = self.build_prompt(query_summary, market_context, all_records)
        raw_dict = await self.provider.generate_json(messages=messages, temperature=0.0, max_tokens=900)
        
        return normalize(raw_dict)
