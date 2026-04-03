"""
test_agents.py
==============
Standalone tests for each of the 3 AI agents:
  1. QueryUnderstandingAgent
  2. MarketResearchAgent
  3. NewsSignalAgent

Run with:
  python3 test_agents.py
"""

import asyncio
import json
import sys
import os
from datetime import datetime

# Load .env before importing agents
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

from providers import LLMProvider
from tools import MarketDataTool, SignalDataTool, FinlightNewsTool
from models import QuerySummary, MarketContext, EvidenceRecord

from agents.query_agent import QueryUnderstandingAgent
from agents.market_agent import MarketResearchAgent
from agents.news_agent import NewsSignalAgent

# ─────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────
SEP = "─" * 60

def banner(title: str):
    print(f"\n{SEP}")
    print(f"  {title}")
    print(SEP)

def ok(label: str, value):
    print(f"  ✅  {label}: {value}")

def fail(label: str, err):
    print(f"  ❌  {label}: {err}")

def section(title: str):
    print(f"\n  ── {title}")


# ─────────────────────────────────────────
# TEST 1 — Query Understanding Agent
# ─────────────────────────────────────────
async def test_query_agent(provider: LLMProvider, query: str) -> QuerySummary:
    banner(f"AGENT 1 · Query Understanding Agent")
    print(f"  Input query: \"{query}\"")

    agent = QueryUnderstandingAgent(provider)
    try:
        result: QuerySummary = await agent.run(query)

        section("Output")
        ok("topic",            result.topic)
        ok("region",           result.region)
        ok("intent",           result.intent)
        ok("informationNeeded", result.informationNeeded)
        ok("searchHints",       result.searchHints)

        # Assertions
        assert result.topic,  "topic must not be empty"
        assert result.region, "region must not be empty"
        assert len(result.searchHints) >= 2, "must have at least 2 search hints"

        print(f"\n  ✅  PASS — Query Understanding Agent")
        return result

    except Exception as e:
        fail("FAIL — Query Understanding Agent", e)
        raise


# ─────────────────────────────────────────
# TEST 2 — Market Research Agent
# ─────────────────────────────────────────
async def test_market_agent(provider: LLMProvider, query_summary: QuerySummary) -> MarketContext:
    banner(f"AGENT 2 · Market Research Agent")
    print(f"  Input topic:  {query_summary.topic}")
    print(f"  Input region: {query_summary.region}")

    tool   = MarketDataTool()
    agent  = MarketResearchAgent(provider, tool)

    try:
        result: MarketContext = await agent.run(query_summary)

        section("Output")
        ok("overview",        result.overview[:120] + "..." if len(result.overview) > 120 else result.overview)
        ok("keyMarkets",      result.keyMarkets)
        ok("industryContext", result.industryContext)
        ok("evidence count",  len(result.evidence))

        # Assertions
        assert result.overview,              "overview must not be empty"
        assert len(result.keyMarkets) > 0,   "must return at least 1 key market"
        assert len(result.industryContext) >= 2, "must return at least 2 industry context points"

        # Region correctness check (no Thailand in non-SEA regions)
        region_lower = query_summary.region.lower()
        if "middle east" in region_lower:
            me_markets = {"saudi arabia", "uae", "qatar", "kuwait", "israel", "egypt", "turkey"}
            found = any(m.lower() in me_markets for m in result.keyMarkets)
            assert found, f"Middle East query should return ME countries, got: {result.keyMarkets}"
            ok("region correctness", f"✓ Middle East countries detected in keyMarkets")
        elif "europe" in region_lower:
            eu_markets = {"germany", "france", "united kingdom", "italy", "spain", "netherlands"}
            found = any(m.lower() in eu_markets for m in result.keyMarkets)
            assert found, f"Europe query should return EU countries, got: {result.keyMarkets}"
            ok("region correctness", f"✓ European countries detected in keyMarkets")

        print(f"\n  ✅  PASS — Market Research Agent")
        return result

    except Exception as e:
        fail("FAIL — Market Research Agent", e)
        raise


# ─────────────────────────────────────────
# TEST 3 — News / Signal Agent (Mock)
# ─────────────────────────────────────────
async def test_news_agent_mock(provider: LLMProvider, query_summary: QuerySummary, market_context: MarketContext):
    banner(f"AGENT 3 · News Signal Agent  [source: mock]")

    signal_tool = SignalDataTool()
    agent       = NewsSignalAgent(provider, signal_tool)

    try:
        result = await agent.run(query_summary, market_context, data_sources=["mock"])

        section("Output")
        ok("recentDevelopments count", len(result.recentDevelopments))
        for i, dev in enumerate(result.recentDevelopments[:3]):
            print(f"         [{i+1}] [{dev.impact.upper()}] {dev.headline[:80]}")
            print(f"              source: {dev.source}  |  market: {dev.market}")

        ok("regionalSignals count", len(result.regionalSignals))
        for sig in result.regionalSignals[:3]:
            print(f"         → {sig}")

        ok("overallInsight", result.overallInsight[:140] + "..." if len(result.overallInsight) > 140 else result.overallInsight)

        # Assertions
        assert len(result.recentDevelopments) > 0, "must return at least 1 development"
        assert result.overallInsight,              "overallInsight must not be empty"

        # Check no generic template phrases
        bad_phrases = ["growing interest", "high adoption rate", "expanding tech sector"]
        combined_text = result.overallInsight + " ".join(result.regionalSignals)
        for phrase in bad_phrases:
            assert phrase.lower() not in combined_text.lower(), \
                f"Template phrase detected: '{phrase}' — prompt engineering failed!"
        ok("anti-template check", "✓ No generic template phrases detected")

        print(f"\n  ✅  PASS — News Signal Agent (Mock)")
        return result

    except Exception as e:
        fail("FAIL — News Signal Agent (Mock)", e)
        raise


# ─────────────────────────────────────────
# TEST 3b — News / Signal Agent (Finlight API)
# ─────────────────────────────────────────
async def test_news_agent_api(provider: LLMProvider, query_summary: QuerySummary, market_context: MarketContext):
    banner(f"AGENT 3b · News Signal Agent  [source: Finlight API]")

    if not os.environ.get("FINLIGHT_API_KEY"):
        print("  ⚠️  SKIPPED — FINLIGHT_API_KEY not set")
        return

    signal_tool = SignalDataTool()
    agent       = NewsSignalAgent(provider, signal_tool)

    try:
        result = await agent.run(query_summary, market_context, data_sources=["api"])

        section("Output")
        ok("recentDevelopments count", len(result.recentDevelopments))
        for i, dev in enumerate(result.recentDevelopments[:4]):
            print(f"         [{i+1}] [{dev.impact.upper()}] {dev.headline[:80]}")
            print(f"              source: {dev.source}  |  published: {dev.publishedAt[:10]}")

        ok("overallInsight", result.overallInsight[:140] + "..." if len(result.overallInsight) > 140 else result.overallInsight)

        assert len(result.recentDevelopments) > 0, "Finlight API returned 0 developments"
        ok("live news check", f"✓ {len(result.recentDevelopments)} real articles retrieved from Finlight")

        print(f"\n  ✅  PASS — News Signal Agent (Finlight API)")
        return result

    except Exception as e:
        fail("FAIL — News Signal Agent (Finlight API)", e)
        # Don't raise — API tests are optional


# ─────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────
TEST_QUERIES = [
    "car spare parts in Middle East",
    "electronics market in North America",
    "agricultural goods in Southeast Asia",
]

async def run_all():
    print("\n" + "═" * 60)
    print("  AI AGENT TEST SUITE")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("═" * 60)

    provider = LLMProvider()

    passed = 0
    failed = 0

    for idx, query in enumerate(TEST_QUERIES):
        if idx > 0:
            print(f"\n  ⏳  Cooling down 20s between scenarios (Groq free-tier rate limit)...")
            await asyncio.sleep(20)

        print(f"\n\n{'═'*60}")
        print(f"  SCENARIO: \"{query}\"")
        print(f"{'═'*60}")

        try:
            # Agent 1
            query_summary = await test_query_agent(provider, query)
            await asyncio.sleep(3)

            # Agent 2
            market_context = await test_market_agent(provider, query_summary)
            await asyncio.sleep(3)

            # Agent 3 — Mock
            await test_news_agent_mock(provider, query_summary, market_context)

            # Agent 3b — Finlight (first query only to save API credits)
            if query == TEST_QUERIES[0]:
                await asyncio.sleep(3)
                await test_news_agent_api(provider, query_summary, market_context)

            passed += 1

        except Exception as e:
            failed += 1
            print(f"\n  ❌  Scenario failed: {e}")

    # ── Final summary ──
    print(f"\n\n{'═'*60}")
    print(f"  RESULTS: {passed} passed / {failed} failed / {len(TEST_QUERIES)} total")
    print(f"{'═'*60}\n")

    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(run_all())
