import os
import ssl
import json
import aiohttp
import certifi
from typing import List, Optional
from models import MarketDataRecord, ExternalSignalRecord

# ---------------------------------------------------------------------------
# Region → ISO-3166-1 alpha-2 country codes mapping (for Finlight API filter)
# ---------------------------------------------------------------------------
REGION_TO_COUNTRY_CODES: dict[str, list[str]] = {
    "southeast asia": ["TH", "SG", "MY", "ID", "VN", "PH", "MM", "KH", "LA", "BN"],
    "asia":           ["CN", "JP", "KR", "IN", "TH", "SG", "MY", "ID", "VN", "PH", "HK", "TW"],
    "asia pacific":   ["CN", "JP", "KR", "AU", "NZ", "IN", "TH", "SG", "MY", "ID", "VN"],
    "east asia":      ["CN", "JP", "KR", "HK", "TW", "MN"],
    "south asia":     ["IN", "PK", "BD", "LK", "NP"],
    "europe":         ["DE", "FR", "GB", "IT", "ES", "NL", "SE", "NO", "DK", "FI", "PL", "CH"],
    "north america":  ["US", "CA", "MX"],
    "latin america":  ["BR", "MX", "AR", "CO", "CL", "PE"],
    "middle east":    ["SA", "AE", "IL", "QA", "KW", "EG", "TR"],
    "africa":         ["ZA", "NG", "KE", "EG", "GH", "ET"],
    "global":         [],  # no filter → all countries
}

# Region → representative key markets (human-readable country names)
REGION_TO_KEY_MARKETS: dict[str, list[str]] = {
    "southeast asia": ["Thailand", "Singapore", "Indonesia", "Vietnam", "Malaysia", "Philippines"],
    "asia":           ["China", "Japan", "South Korea", "India", "Singapore", "Hong Kong"],
    "asia pacific":   ["China", "Japan", "Australia", "South Korea", "India", "New Zealand"],
    "east asia":      ["China", "Japan", "South Korea", "Taiwan", "Hong Kong"],
    "south asia":     ["India", "Pakistan", "Bangladesh", "Sri Lanka"],
    "europe":         ["Germany", "France", "United Kingdom", "Italy", "Spain", "Netherlands"],
    "north america":  ["United States", "Canada", "Mexico"],
    "latin america":  ["Brazil", "Mexico", "Argentina", "Colombia", "Chile"],
    "middle east":    ["Saudi Arabia", "UAE", "Israel", "Qatar", "Kuwait", "Egypt", "Turkey"],
    "africa":         ["South Africa", "Nigeria", "Kenya", "Egypt", "Ghana"],
    "global":         ["United States", "China", "Germany", "Japan", "United Kingdom", "India"],
}

def _region_to_codes(region: str) -> List[str]:
    key = region.lower().strip()
    for pattern, codes in REGION_TO_COUNTRY_CODES.items():
        if pattern in key:
            return codes
    return []

def _region_to_markets(region: str) -> List[str]:
    key = region.lower().strip()
    for pattern, markets in REGION_TO_KEY_MARKETS.items():
        if pattern in key:
            return markets
    return ["Global Markets"]

# ---------------------------------------------------------------------------
# Market Data Tool — Region-Aware (no more hardcoded Thailand)
# ---------------------------------------------------------------------------
class MarketDataTool:
    async def load_market_data(
        self, topic: str, region: str, search_hints: List[str]
    ) -> List[MarketDataRecord]:
        key_markets = _region_to_markets(region)
        records = []
        for country in key_markets[:4]:  # Return top 4 representative markets
            records.append(
                MarketDataRecord(
                    country=country,
                    topic=topic,
                    region=region,
                    overviewPoints=[
                        f"{country} is an active market for {topic}",
                        f"Demand for {topic} in {country} is tracked by regional trade data",
                    ],
                    industrySignals=[
                        f"{region} regulatory environment impacts {topic} supply chains",
                        f"Cross-border trade flows in {region} are influencing {topic} pricing",
                    ],
                    source=f"Regional Market Intelligence — {region}",
                )
            )
        return records


# ---------------------------------------------------------------------------
# Finlight News Tool — Live API
# ---------------------------------------------------------------------------
FINLIGHT_ARTICLES_URL = "https://api.finlight.me/v2/articles"

_SENTIMENT_TO_IMPACT = {
    "positive": "positive",
    "negative": "negative",
    "neutral":  "neutral",
}

def _map_sentiment(sentiment: Optional[str]) -> str:
    return _SENTIMENT_TO_IMPACT.get((sentiment or "neutral").lower(), "neutral")

def _confidence_from_score(score: Optional[float]) -> str:
    if score is None:
        return "medium"
    if score >= 0.75:
        return "high"
    if score >= 0.45:
        return "medium"
    return "low"


class FinlightNewsTool:
    """Fetches financial news from the Finlight v2 REST API."""

    def __init__(self):
        self.api_key = os.environ.get("FINLIGHT_API_KEY", "")

    async def fetch_news(
        self,
        topic: str,
        region: str,
        key_markets: List[str],
        search_hints: List[str],
        page_size: int = 15,
    ) -> List[ExternalSignalRecord]:
        if not self.api_key:
            raise RuntimeError("FINLIGHT_API_KEY is not set in environment variables.")

        hint_str = " OR ".join(search_hints[:5]) if search_hints else ""
        query = f"{topic} {hint_str}".strip()

        country_codes = _region_to_codes(region)

        payload: dict = {
            "query":    query,
            "language": "en",
            "pageSize": page_size,
            "order":    "DESC",
            "orderBy":  "publishDate",
        }
        if country_codes:
            payload["countries"] = country_codes

        headers = {
            "accept":       "application/json",
            "Content-Type": "application/json",
            "X-API-KEY":    self.api_key,
        }

        ssl_ctx = ssl.create_default_context(cafile=certifi.where())
        connector = aiohttp.TCPConnector(ssl=ssl_ctx)
        async with aiohttp.ClientSession(connector=connector) as session:
            async with session.post(
                FINLIGHT_ARTICLES_URL, json=payload, headers=headers,
                timeout=aiohttp.ClientTimeout(total=15)
            ) as resp:
                resp.raise_for_status()
                data = await resp.json()

        articles = data.get("articles", [])
        records: List[ExternalSignalRecord] = []

        for art in articles:
            art_countries = art.get("countries", [])
            country_label = art_countries[0] if art_countries else region

            headline = (art.get("title") or "").strip()
            summary  = (art.get("summary") or headline).strip()
            source   = (art.get("source") or "Finlight").strip()
            pub_date = (art.get("publishDate") or "").strip()

            if not headline:
                continue

            records.append(
                ExternalSignalRecord(
                    country=country_label,
                    topic=topic,
                    region=region,
                    headline=headline,
                    summary=summary,
                    impact=_map_sentiment(art.get("sentiment")),
                    source=source,
                    publishedAt=pub_date,
                )
            )

        return records


# ---------------------------------------------------------------------------
# Legacy Signal Data Tool — Region-Aware Mock Fallback
# ---------------------------------------------------------------------------
class SignalDataTool:
    async def load_signals(
        self, topic: str, region: str, key_markets: List[str], search_hints: List[str]
    ) -> List[ExternalSignalRecord]:
        markets = _region_to_markets(region)
        records = []
        for country in markets[:3]:
            records.append(
                ExternalSignalRecord(
                    country=country,
                    topic=topic,
                    region=region,
                    headline=f"Market momentum detected for {topic} in {country}",
                    summary=f"Trade intelligence signals indicate notable activity in {topic} within {country}, driven by regional economic shifts in {region}.",
                    impact="positive",
                    source=f"Regional Signal DB — {region}",
                    publishedAt="2026-04-03T00:00:00Z",
                )
            )
        return records
