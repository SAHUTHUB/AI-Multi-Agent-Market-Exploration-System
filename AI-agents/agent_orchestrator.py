import os
import sys
import json
import asyncio
from typing import List

# Pre-load environment variables if a .env file is present
from dotenv import load_dotenv
load_dotenv()

from models import (
    MarketInsightWorkflowInput, 
    MarketInsightWorkflowResult,
    EvidenceRecord,
    RecentDevelopment
)
from providers import LLMProvider
from tools import MarketDataTool, SignalDataTool

from agents.query_agent import QueryUnderstandingAgent
from agents.market_agent import MarketResearchAgent
from agents.news_agent import NewsSignalAgent

def dedupe_evidence(evidence: List[EvidenceRecord]) -> List[EvidenceRecord]:
    seen = set()
    result = []
    for item in evidence:
        key = f"{item.country}|{item.source}|{item.headline or ''}"
        if key not in seen:
            seen.add(key)
            result.append(item)
    return result

class MarketInsightOrchestrator:
    def __init__(self):
        provider = LLMProvider()
        market_data_tool = MarketDataTool()
        signal_data_tool = SignalDataTool()
        
        self.query_understanding_agent = QueryUnderstandingAgent(provider)
        self.market_research_agent = MarketResearchAgent(provider, market_data_tool)
        self.news_signal_agent = NewsSignalAgent(provider, signal_data_tool)

    async def run(self, input_data: MarketInsightWorkflowInput) -> MarketInsightWorkflowResult:
        query = input_data.query.strip()
        if not query:
            raise ValueError("MarketInsightOrchestrator: query is required")

        execution_trace = ['workflow_started']

        query_summary = await self.query_understanding_agent.run(query)
        execution_trace.append('query_understanding_completed')

        market_context = await self.market_research_agent.run(query_summary)
        execution_trace.append('market_research_completed')

        data_source = input_data.dataSource if input_data.dataSource else ['mock']
        signal_analysis = await self.news_signal_agent.run(
            query_summary,
            market_context,
            data_source
        )
        execution_trace.append('news_signal_analysis_completed')
        
        # Deduplicate evidence
        combined_evidence = market_context.evidence + signal_analysis.evidence
        final_evidence = dedupe_evidence(combined_evidence)

        execution_trace.append(f'query_breakdown: topic="{query_summary.topic}", region="{query_summary.region}", intent="{query_summary.intent}", info=["{", ".join(query_summary.informationNeeded)}"]')
        execution_trace.append(f'market_context_result: key_markets=["{", ".join(market_context.keyMarkets)}"]')
        
        unique_sources = list(dict.fromkeys([e.source for e in signal_analysis.evidence]))
        execution_trace.append(f'news_analysis_result: found={len(signal_analysis.recentDevelopments)} developments, sources={", ".join(data_source)}, references=["{", ".join(unique_sources)}"]')

        missing_keys = []
        if not os.environ.get("GROQ_API_KEY"): missing_keys.append("GROQ_API_KEY")
        if "api" in data_source and not os.environ.get("GNEWS_API_KEY"): missing_keys.append("GNEWS_API_KEY")
        
        if missing_keys:
            execution_trace.append(f'warning: missing {", ".join(missing_keys)}')

        execution_trace.append('workflow_completed')

        return MarketInsightWorkflowResult(
            topic=query_summary.topic,
            region=query_summary.region,
            keyMarkets=market_context.keyMarkets,
            marketInsights=market_context.overview,
            industryContext=market_context.industryContext,
            recentDevelopments=signal_analysis.recentDevelopments,
            regionalSignals=signal_analysis.regionalSignals,
            overallInsight=signal_analysis.overallInsight,
            evidence=final_evidence,
            executionTrace=execution_trace
        )

def get_mock_fallback(query: str, reason: str) -> MarketInsightWorkflowResult:
    return MarketInsightWorkflowResult(
        topic=query,
        region="Global",
        keyMarkets=["Mock Market A", "Mock Market B"],
        marketInsights=f"[MOCK DATA] Please set a valid GROQ_API_KEY to see real AI insights. ({reason})",
        industryContext=["Mock industry trend 1", "Mock industry trend 2"],
        recentDevelopments=[
            RecentDevelopment(
                market="Global",
                headline="⚠️ API Setup Required",
                summary=f"The system encountered an API issue: {reason}. It is displaying static mock data instead.",
                impact="neutral",
                confidence="medium",
                source="System Warning",
                publishedAt="Now"
            )
        ],
        regionalSignals=["Mock Signal 1", "Mock Signal 2"],
        overallInsight="[MOCK DATA] You are viewing placeholder data. Update your environment variables to enable the AI Agents.",
        evidence=[],
        executionTrace=[f"warning: API fallback triggered. Reason: {reason}"]
    )

async def main():
    try:
        # 1. Read input from stdin
        raw_input = sys.stdin.read().strip()
        if not raw_input:
            raise ValueError("Empty input provided on stdin")
            
        input_dict = json.loads(raw_input)
        
        # 2. Parse using Pydantic Schema
        workflow_input = MarketInsightWorkflowInput(**input_dict)
        
        # 3. Initialize orchestrator and run
        orchestrator = MarketInsightOrchestrator()
        
        try:
            result = await orchestrator.run(workflow_input)
        except Exception as api_err:
            if "GROQ" in str(api_err).upper() or "API" in str(api_err).upper():
                result = get_mock_fallback(workflow_input.query, str(api_err))
            else:
                raise api_err
        
        # 4. Print EXACTLY the JSON result to stdout
        sys.stdout.write(json.dumps(result.model_dump(), indent=2))
        
    except Exception as e:
        error_json = json.dumps({"error": str(e)})
        sys.stdout.write(error_json)

if __name__ == "__main__":
    asyncio.run(main())
