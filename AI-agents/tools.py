import json
from typing import List
from models import MarketDataRecord, ExternalSignalRecord

# In Python we can mock data exactly like the TypeScript version did.
# For brevity, these return some static mocked JSON or simulated structured data

class MarketDataTool:
    async def load_market_data(self, topic: str, region: str, search_hints: List[str]) -> List[MarketDataRecord]:
        # Return mocked data representing the `mock` capability
        return [
            MarketDataRecord(
                country="Thailand",
                topic=topic,
                region=region,
                overviewPoints=[f"Growing interest in {topic}", "High adoption rate"],
                industrySignals=["Tech sector expanding", "New policies drafted"],
                source="Mocked Market DB"
            )
        ]

class SignalDataTool:
    async def load_signals(self, topic: str, region: str, key_markets: List[str], search_hints: List[str]) -> List[ExternalSignalRecord]:
        return [
            ExternalSignalRecord(
                country="Thailand",
                topic=topic,
                region=region,
                headline=f"New breakthrough in {topic} space",
                summary=f"Recent developments show positive trends for {topic} in {region}",
                impact="positive",
                source="Mocked Signal DB",
                publishedAt="2026-04-01T00:00:00Z"
            )
        ]
