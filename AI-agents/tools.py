import os
import ssl
import json
import aiohttp
import certifi
from typing import List, Optional, Dict, Tuple
from models import MarketDataRecord, ExternalSignalRecord

# ─────────────────────────────────────────────────────────────────────────────
# Region Mappings
# ─────────────────────────────────────────────────────────────────────────────
REGION_TO_COUNTRY_CODES: Dict[str, List[str]] = {
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
    "global":         [],
}

REGION_TO_KEY_MARKETS: Dict[str, List[str]] = {
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

def _region_key(region: str) -> str:
    r = region.lower().strip()
    for pattern in REGION_TO_COUNTRY_CODES:
        if pattern in r:
            return pattern
    return "global"

def _region_to_codes(region: str) -> List[str]:
    return REGION_TO_COUNTRY_CODES.get(_region_key(region), [])

def _region_to_markets(region: str) -> List[str]:
    return REGION_TO_KEY_MARKETS.get(_region_key(region), ["Global Markets"])


# ─────────────────────────────────────────────────────────────────────────────
# Rich Mock Data Library
# Keys: (region_pattern, topic_keywords)  →  list of MarketDataRecord dicts
# ─────────────────────────────────────────────────────────────────────────────
def _topic_category(topic: str) -> str:
    t = topic.lower()
    if any(k in t for k in ["car", "auto", "vehicle", "spare", "part", "motor"]):
        return "automotive"
    if any(k in t for k in ["electric", "ev", "battery", "tesla", "byd"]):
        return "ev"
    if any(k in t for k in ["electron", "semiconductor", "chip", "tech", "device", "gadget"]):
        return "electronics"
    if any(k in t for k in ["agri", "farm", "food", "crop", "rice", "wheat", "grain", "produce"]):
        return "agriculture"
    if any(k in t for k in ["fashion", "textile", "cloth", "apparel", "garment"]):
        return "textiles"
    if any(k in t for k in ["chemical", "petrochemi", "plastic", "resin"]):
        return "chemicals"
    if any(k in t for k in ["pharma", "medicine", "drug", "health", "medical"]):
        return "pharma"
    if any(k in t for k in ["energy", "oil", "gas", "solar", "renew", "fuel"]):
        return "energy"
    if any(k in t for k in ["logistic", "shipping", "freight", "supply chain", "transport"]):
        return "logistics"
    return "general"


# Rich curated data: (region_key, topic_category) → list of country record dicts
RICH_MOCK_DATA: Dict[Tuple[str, str], List[Dict]] = {

    # ── Automotive / Car Spare Parts ─────────────────────────────────────────
    ("middle east", "automotive"): [
        {"country": "Saudi Arabia", "overviewPoints": [
            "Saudi Arabia's automotive aftermarket is valued at USD 4.2B (2024), growing at 6.1% CAGR",
            "Over 11 million registered vehicles with average age of 7 years, driving high spare parts demand",
            "Key players: Al-Jomaih AutoWorld, Abdul Latif Jameel, and regional OEM distributors",
        ], "industrySignals": [
            "Vision 2030 infrastructure investment is increasing fleet size by 12% annually",
            "Import tariffs on aftermarket parts reduced to 5% under GCC harmonization",
            "Growing demand for Tier-1 OEM-quality parts over grey-market alternatives",
        ]},
        {"country": "UAE", "overviewPoints": [
            "UAE automotive parts market worth USD 2.8B, with Dubai as the regional re-export hub",
            "Jebel Ali Free Zone processes 40% of the region's automotive parts imports",
            "Key distributors: Al-Futtaim, Ghobash, and Arabian Automobiles",
        ], "industrySignals": [
            "UAE's Zero-tariff policy in free zones attracts major global parts manufacturers",
            "Digital spare parts platforms (e.g., SpareParts.ae) growing 35% YoY",
            "EV fleet expansion creating demand for new-category EV parts stockists",
        ]},
        {"country": "Qatar", "overviewPoints": [
            "Qatar spare parts market at USD 820M, underpinned by 950,000+ registered vehicles",
            "Post-World Cup infrastructure expansion has boosted commercial vehicle spare parts by 18%",
        ], "industrySignals": [
            "Qatar National Vision 2030 mandates preference for locally certified part suppliers",
            "Import demand for brake systems and HVAC components up 22% in 2024",
        ]},
        {"country": "Kuwait", "overviewPoints": [
            "Kuwait automotive market heavily import-dependent; parts sourced mainly from Japan, USA, South Korea",
            "Market size: USD 610M with strong preference for Toyota and Lexus OEM spares",
        ], "industrySignals": [
            "Government fleet renewal program adding 25,000 vehicles — boosting commercial parts demand",
            "Cross-border trade with Saudi Arabia and UAE growing via GCC Free Trade Area",
        ]},
    ],

    ("southeast asia", "automotive"): [
        {"country": "Thailand", "overviewPoints": [
            "Thailand is the 'Detroit of Asia' — producing 1.9M vehicles/year and a major spare parts hub",
            "Automotive aftermarket valued at USD 6.1B; over 650 local parts manufacturers (BOI data)",
            "Key OEM suppliers: Denso, Aisin, Toyota Industries, Somboon Advance Technology",
        ], "industrySignals": [
            "EV transition is disrupting ICE parts demand; government offers 0% duty on EV parts",
            "ASEAN Free Trade Area (AFTA) allows 0–5% intra-regional tariffs on auto parts",
            "Thailand 4.0 policy driving upgrades in precision parts manufacturing",
        ]},
        {"country": "Indonesia", "overviewPoints": [
            "Indonesia's automotive parts market: USD 4.8B with 20M+ motorcycles needing parts annually",
            "Strong local supplier ecosystem through GIAMM (Asosiasi Industri Alat-Alat Mesin)",
        ], "industrySignals": [
            "EV policy (Perpres 55/2019) boosting local battery and drivetrain part production",
            "Disruption from Chinese low-cost parts imports compressing margins for domestic suppliers",
        ]},
        {"country": "Vietnam", "overviewPoints": [
            "Vietnam auto parts sector worth USD 2.1B, rapidly growing as FDI flows from Japan and South Korea",
            "Key industrial zones: Binh Duong, Dong Nai hosting 150+ Tier-2 suppliers",
        ], "industrySignals": [
            "EVFTA (EU-Vietnam FTA) reducing tariffs on EU-origin parts, enabling competitive pricing",
            "VinFast's domestic production boosting localization rate for Vietnamese-made spares",
        ]},
    ],

    # ── Electronics / Semiconductors ─────────────────────────────────────────
    ("north america", "electronics"): [
        {"country": "United States", "overviewPoints": [
            "US consumer electronics market: USD 505B (2024), largest globally",
            "Semiconductor revenue: USD 98B — companies include Intel, Qualcomm, NVIDIA, AMD, Texas Instruments",
            "Key hubs: Silicon Valley (CA), Austin TX, Research Triangle NC",
        ], "industrySignals": [
            "CHIPS Act (USD 52.7B) driving domestic fab investment: Intel, TSMC, Samsung building US plants",
            "AI chip demand surging — NVIDIA A100/H100 GPUs backordered 12+ months",
            "Consumer device refresh cycle accelerating post-pandemic slowdown recovery",
        ]},
        {"country": "Canada", "overviewPoints": [
            "Canada electronics market: USD 42B; strong in telecom equipment and defence electronics",
            "Key companies: BlackBerry (IoT), Celestica (contract manufacturing), Ballard Power",
        ], "industrySignals": [
            "Canada's C$2.4B investment in semiconductor ecosystem announced 2024",
            "Ontario and Quebec emerging as AI hardware development centres",
        ]},
        {"country": "Mexico", "overviewPoints": [
            "Mexico's electronics manufacturing (maquiladora) exports: USD 87B/year",
            "Tijuana, Monterrey, Juárez as key electronics manufacturing cities serving US OEMs",
        ], "industrySignals": [
            "Nearshoring trend post-COVID is driving 30% growth in Mexico electronics FDI",
            "Samsung, LG, Foxconn expanding Mexican operations to serve North American market",
        ]},
    ],

    ("east asia", "electronics"): [
        {"country": "South Korea", "overviewPoints": [
            "South Korea semiconductor exports: USD 128B (2023) — Samsung and SK Hynix lead DRAM/NAND",
            "Consumer electronics giant: Samsung Electronics, LG, and Hyundai Mobis",
        ], "industrySignals": [
            "Samsung's 3nm GAA process at Pyeongtaek fab competing directly with TSMC",
            "South Korea–US semiconductor alliance strengthened under Chip 4 pact",
        ]},
        {"country": "Taiwan", "overviewPoints": [
            "Taiwan produces 92% of the world's most advanced chips (sub-10nm nodes) via TSMC",
            "Taiwan semiconductor industry revenue: USD 155B (2024)",
        ], "industrySignals": [
            "TSMC's N2 process (2nm) entering risk production in late 2025 — Apple and NVIDIA first customers",
            "Geopolitical risk premium embedded in global chip supply chain resilience strategies",
        ]},
        {"country": "China", "overviewPoints": [
            "China's electronics market: USD 960B — world's largest consumer and manufacturer",
            "Domestic brands HUAWEI, Xiaomi, OPPO, DJI competing globally",
        ], "industrySignals": [
            "US export controls on advanced chips (EAR) restricting access to sub-14nm technology",
            "SMIC pushing to 7nm with DUV workaround — achieving partial self-sufficiency",
        ]},
    ],

    # ── Agriculture ───────────────────────────────────────────────────────────
    ("southeast asia", "agriculture"): [
        {"country": "Thailand", "overviewPoints": [
            "Thailand is the world's 2nd largest rice exporter (7.5M tonnes/year) and top rubber producer",
            "Agricultural sector contributes 8.1% of GDP; 40% of workforce employed in agriculture",
            "Key export markets: China, USA, Japan, and EU for rice, cassava, and canned goods",
        ], "industrySignals": [
            "El Niño drought conditions in 2024 reduced sugarcane output by 14%",
            "Thailand 4.0 smart farming initiative deploying IoT sensors across 2M hectares",
            "RCEP agreement opening new export windows for Thai frozen foods to Japan and South Korea",
        ]},
        {"country": "Vietnam", "overviewPoints": [
            "Vietnam is the world's 3rd largest rice exporter and top cashew/coffee/pepper exporter",
            "Mekong Delta region produces 55% of Vietnam's rice output",
        ], "industrySignals": [
            "Record rice export prices (USD 650/tonne) in 2024 as India banned non-basmati exports",
            "Coffee output down 15% due to drought; Robusta prices at 10-year high",
        ]},
        {"country": "Indonesia", "overviewPoints": [
            "Indonesia: world's largest palm oil producer (46M tonnes/year) and major cocoa exporter",
            "Agriculture employs 28% of Indonesia's 140M workforce",
        ], "industrySignals": [
            "EU Deforestation Regulation (EUDR) creating compliance pressure on palm oil supply chains",
            "Government mandating B35 biodiesel blend — consuming 13.1M tonnes of CPO domestically",
        ]},
    ],

    ("europe", "agriculture"): [
        {"country": "Germany", "overviewPoints": [
            "Germany's agri-food sector: EUR 215B turnover — 4th largest food exporter globally",
            "Leader in agricultural machinery: CLAAS, AGCO, Fendt supply global markets",
        ], "industrySignals": [
            "EU Green Deal Farm-to-Fork strategy reducing chemical inputs by 50% by 2030",
            "German farmer protests (2024) over diesel subsidy removal impacting supply costs",
        ]},
        {"country": "France", "overviewPoints": [
            "France: EU's largest agricultural producer — EUR 84B in annual farm output",
            "World leader in wine, cheese, wheat exports across 100+ countries",
        ], "industrySignals": [
            "Extreme weather events impacting Bordeaux wine vintage quality — 2024 crop down 18%",
            "France's 'Egalim' law increasing minimum farm gate prices for domestic producers",
        ]},
    ],

    # ── EV Market ─────────────────────────────────────────────────────────────
    ("southeast asia", "ev"): [
        {"country": "Thailand", "overviewPoints": [
            "Thailand targets 30% EV sales share by 2030 (30@30 policy); 80,000 EVs sold in 2023",
            "BYD, NETA, Great Wall Motor opened Thai factories — combined capacity 200,000 units/year",
            "Government offers THB 150,000 subsidy per EV + waived import duties",
        ], "industrySignals": [
            "Chinese EV brands captured 78% of Thailand EV market in H1 2024",
            "PTT building 1,000 EV charging stations under EleX by PTT initiative",
            "Thailand Industrial Estate Authority attracting USD 2.4B EV battery plant investments",
        ]},
        {"country": "Indonesia", "overviewPoints": [
            "Indonesia sitting on 25% of global nickel reserves — critical for EV batteries",
            "Government banned raw nickel ore export, forcing battery material processing domestically",
        ], "industrySignals": [
            "Hyundai-LG battery joint venture (HLI Green Power) operational in Karawang, West Java",
            "EV adoption at 15,000 units in 2023 — low but growing with new model launches",
        ]},
    ],

    ("middle east", "ev"): [
        {"country": "Saudi Arabia", "overviewPoints": [
            "NEOM and Vision 2030 earmarking USD 6B for EV and clean transport infrastructure",
            "Lucid Motors' Saudi-backed factory (King Abdullah Economic City) producing 5,000 EVs/year",
        ], "industrySignals": [
            "Saudi Aramco investing in EV charging network alongside Aramco Ventures portfolio",
            "Government waiving 15% VAT on EV purchases to accelerate adoption through 2026",
        ]},
        {"country": "UAE", "overviewPoints": [
            "UAE EV market growing 63% YoY — 8,200 EVs sold in 2023 (EVIQ data)",
            "Dubai's RTA operates 280 EV taxis; target of 42,000 EV fleet by 2027",
        ], "industrySignals": [
            "DEWA rolled out 1,000+ EV Green Charger stations across Dubai by Q1 2024",
            "Abu Dhabi sovereign fund (Mubadala) invested USD 1.8B in global EV supply chain",
        ]},
    ],

    # ── Energy ───────────────────────────────────────────────────────────────
    ("middle east", "energy"): [
        {"country": "Saudi Arabia", "overviewPoints": [
            "Saudi Arabia holds 17% of world's proven crude oil reserves; Aramco revenue USD 477B (2023)",
            "Neom project includes 4GW green hydrogen facility — world's largest planned",
        ], "industrySignals": [
            "OPEC+ output cuts of 1.66M bbl/day supporting Brent price above USD 80/barrel",
            "Saudi Arabia targets 50% renewables in electricity mix by 2030 (Saudi Vision 2030)",
        ]},
        {"country": "UAE", "overviewPoints": [
            "UAE's ADNOC targeting 5M bbl/day output by 2027 from current 4.2M bbl/day",
            "Masdar (Abu Dhabi Future Energy) deployed 20GW renewable projects across 40 countries",
        ], "industrySignals": [
            "UAE hosted COP28 (2023) committing to tripling renewables globally by 2030",
            "ADNOC blue ammonia exports to Japan and South Korea ramping up as clean fuel",
        ]},
    ],

    # ── Textiles ─────────────────────────────────────────────────────────────
    ("southeast asia", "textiles"): [
        {"country": "Vietnam", "overviewPoints": [
            "Vietnam: world's 3rd largest garment exporter — USD 44B in textile/apparel exports (2023)",
            "Key buyers: H&M, Zara, Nike, Adidas sourcing from 6,000+ factories",
        ], "industrySignals": [
            "EVFTA giving Vietnamese exporters 0% tariff to EU — gaining share vs Bangladesh",
            "US import orders rebounding after 18-month inventory correction ends in 2024",
        ]},
        {"country": "Indonesia", "overviewPoints": [
            "Indonesia textile and garment industry: USD 13B export value; 3.7M workers employed",
            "Strength in synthetic fibres and denim — key brands include Sritex (now restructuring)",
        ], "industrySignals": [
            "Chinese textile dumping complaints filed at WTO by Indonesian manufacturers",
            "Carbon border adjustment pushing Indonesian mills to adopt greener dyeing processes",
        ]},
    ],

    # ── Pharma ───────────────────────────────────────────────────────────────
    ("europe", "pharma"): [
        {"country": "Germany", "overviewPoints": [
            "Germany's pharma industry: EUR 63B revenue — home to Bayer, Merck KGaA, Boehringer Ingelheim",
            "Europe's largest pharmaceutical market with 500+ manufacturing sites",
        ], "industrySignals": [
            "EU Pharmaceutical Strategy driving shortlist of critical medicine companies for EU-based production",
            "Bayer's USD 3.4B Monsanto litigation settlement reducing investment capacity",
        ]},
        {"country": "Switzerland", "overviewPoints": [
            "Switzerland hosts Novartis and Roche — combined market cap exceeding USD 500B",
            "Swiss pharma exports: CHF 110B/year, representing 37% of total Swiss exports",
        ], "industrySignals": [
            "GLP-1 weight-loss drug boom benefiting Novartis through downstream cardiovascular pipeline",
            "Swiss franc strength compressing margins; Roche cutting 2,400 jobs in 2024",
        ]},
    ],
}


def _get_rich_records(topic: str, region: str) -> List[Dict]:
    """Look up pre-curated rich data for the (region, topic_category) pair."""
    region_k = _region_key(region)
    topic_k  = _topic_category(topic)
    key = (region_k, topic_k)
    if key in RICH_MOCK_DATA:
        return RICH_MOCK_DATA[key]
    # Try global fallback for topic
    for (r, t), records in RICH_MOCK_DATA.items():
        if t == topic_k:
            return records  # use any region's data as a reference baseline
    return []  # no match → fall back to generic


# ─────────────────────────────────────────────────────────────────────────────
# Market Data Tool — uses rich data when available, generic fallback otherwise
# ─────────────────────────────────────────────────────────────────────────────
class MarketDataTool:
    async def load_market_data(
        self, topic: str, region: str, search_hints: List[str]
    ) -> List[MarketDataRecord]:
        rich = _get_rich_records(topic, region)
        key_markets = _region_to_markets(region)
        records: List[MarketDataRecord] = []

        if rich:
            for item in rich[:4]:
                records.append(MarketDataRecord(
                    country=item["country"],
                    topic=topic,
                    region=region,
                    overviewPoints=item["overviewPoints"],
                    industrySignals=item["industrySignals"],
                    source=f"Market Intelligence Database — {item['country']}/{region}",
                ))
        else:
            # Generic skeleton fallback
            for country in key_markets[:4]:
                records.append(MarketDataRecord(
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
                ))
        return records


# ─────────────────────────────────────────────────────────────────────────────
# Finlight News Tool — Live REST API
# ─────────────────────────────────────────────────────────────────────────────
FINLIGHT_ARTICLES_URL = "https://api.finlight.me/v2/articles"

_SENTIMENT_TO_IMPACT = {
    "positive": "positive",
    "negative": "negative",
    "neutral":  "neutral",
}

def _map_sentiment(sentiment: Optional[str]) -> str:
    return _SENTIMENT_TO_IMPACT.get((sentiment or "neutral").lower(), "neutral")


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
            raise RuntimeError("FINLIGHT_API_KEY is not set.")

        hint_str = " OR ".join(search_hints[:5]) if search_hints else ""
        query    = f"{topic} {hint_str}".strip()
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

        ssl_ctx   = ssl.create_default_context(cafile=certifi.where())
        connector = aiohttp.TCPConnector(ssl=ssl_ctx)
        async with aiohttp.ClientSession(connector=connector) as session:
            async with session.post(
                FINLIGHT_ARTICLES_URL, json=payload, headers=headers,
                timeout=aiohttp.ClientTimeout(total=15)
            ) as resp:
                resp.raise_for_status()
                data = await resp.json()

        articles = data.get("articles", [])
        records:  List[ExternalSignalRecord] = []

        for art in articles:
            art_countries = art.get("countries", [])
            country_label = art_countries[0] if art_countries else region
            headline  = (art.get("title")   or "").strip()
            summary   = (art.get("summary") or headline).strip()
            source    = (art.get("source")  or "Finlight").strip()
            pub_date  = (art.get("publishDate") or "").strip()
            if not headline:
                continue
            records.append(ExternalSignalRecord(
                country=country_label, topic=topic, region=region,
                headline=headline, summary=summary,
                impact=_map_sentiment(art.get("sentiment")),
                source=source, publishedAt=pub_date,
            ))
        return records


# ─────────────────────────────────────────────────────────────────────────────
# Signal Data Tool — mock news signals with rich context where available
# ─────────────────────────────────────────────────────────────────────────────
# Pre-curated realistic signal records for common topics/regions
RICH_SIGNALS: Dict[Tuple[str, str], List[Dict]] = {

    ("middle east", "automotive"): [
        {"country": "Saudi Arabia", "headline": "Saudi Arabia's automotive aftermarket hits USD 4.2B as Vision 2030 expands fleet",
         "summary": "Rising vehicle ownership driven by urbanization under Vision 2030 is pushing Saudi Arabia's aftermarket parts demand to new highs, particularly for braking, cooling and filtration categories.",
         "impact": "positive", "source": "MENA Auto Trade Report"},
        {"country": "UAE", "headline": "Dubai's Jebel Ali becomes top auto-parts re-export hub processing USD 1.1B in 2024",
         "summary": "The UAE's zero-tariff free zone model is cementing Jebel Ali as the distribution gateway for automotive spare parts across the Gulf, East Africa, and South Asia.",
         "impact": "positive", "source": "Gulf Industry News"},
        {"country": "Qatar", "headline": "Qatar post-World Cup infrastructure boom drives 18% surge in commercial vehicle parts",
         "summary": "Heavy equipment and truck spare parts demand in Qatar surged 18% YoY as infrastructure contractors sustained operations beyond the World Cup construction cycle.",
         "impact": "positive", "source": "Qatar Business Review"},
    ],

    ("southeast asia", "automotive"): [
        {"country": "Thailand", "headline": "Thailand's USD 6.1B auto parts industry warns of EV disruption to ICE supply chains",
         "summary": "Thai automotive parts associations warn that accelerating EV adoption — especially from Chinese brands — could render 30% of existing ICE parts production capacity obsolete by 2030.",
         "impact": "negative", "source": "Bangkok Post Business"},
        {"country": "Indonesia", "headline": "Indonesian parts makers face margin squeeze from Chinese low-cost imports",
         "summary": "Indonesian domestic car parts manufacturers are reporting 8–15% margin compression as Chinese-made aftermarket components flood the market at 40% lower price points.",
         "impact": "negative", "source": "Bisnis Indonesia"},
        {"country": "Vietnam", "headline": "VinFast localisation drive boosts Vietnamese-made auto parts demand by 34%",
         "summary": "VinFast's target of 60% local content rate by 2025 is creating substantial new demand for Vietnamese-manufactured parts, benefiting Tier-2 suppliers in Binh Duong and Dong Nai provinces.",
         "impact": "positive", "source": "Vietnam Investment Review"},
    ],

    ("north america", "electronics"): [
        {"country": "United States", "headline": "CHIPS Act funding unlocks USD 52.7B for US semiconductor domestic production",
         "summary": "Intel, TSMC-Arizona, and Samsung have collectively committed USD 200B+ in US fab investments since the CHIPS Act passage, with first advanced node production expected by 2026.",
         "impact": "positive", "source": "Semiconductor Industry Association"},
        {"country": "United States", "headline": "NVIDIA GPU shortage extends into 2025 as AI data centre demand outstrips H100 supply",
         "summary": "Hyperscalers including Microsoft, Google, and Meta are competing for NVIDIA H100 allocations, pushing delivery timelines beyond 12 months and driving up spot market pricing 3x.",
         "impact": "mixed", "source": "The Information"},
        {"country": "Mexico", "headline": "Mexico nearshoring boom attracts USD 15B in electronics FDI in 2024",
         "summary": "Samsung, LG, and Foxconn are significantly expanding Mexican manufacturing operations, capitalizing on USMCA trade benefits and proximity to US consumer markets.",
         "impact": "positive", "source": "ProMéxico Trade Report"},
    ],

    ("southeast asia", "agriculture"): [
        {"country": "Thailand", "headline": "Thailand rice export revenue hits USD 5.8B as India ban lifts global prices",
         "summary": "India's non-basmati rice export ban created a supply vacuum that Thai exporters are filling, with Thai white rice prices rising to USD 650/tonne — a 15-year high.",
         "impact": "positive", "source": "Thai Rice Exporters Association"},
        {"country": "Vietnam", "headline": "Vietnam coffee Robusta prices at decade-high amid southeast Asia drought",
         "summary": "Severe drought in the Central Highlands reduced Vietnam's coffee output by 15%, pushing global Robusta prices above USD 4,000/tonne — commodity trading companies revising 2025 forecasts upward.",
         "impact": "positive", "source": "Reuters Commodities"},
        {"country": "Indonesia", "headline": "EU Deforestation Regulation threatens USD 8B Indonesian palm oil export corridor",
         "summary": "Indonesian palm oil exporters face potential exclusion from EU markets unless they obtain EUDR-compliant deforestation-free certification by December 2025, affecting 8,000+ smallholder plantations.",
         "impact": "negative", "source": "GAPKI Indonesia"},
    ],

    ("southeast asia", "ev"): [
        {"country": "Thailand", "headline": "BYD, NETA capture 78% of Thailand EV market as government subsidy takes effect",
         "summary": "Chinese EV brands are dominating Thailand's rapidly growing electric vehicle market, with BYD Atto 3 and Seal models leading sales charts after THB 150,000 government subsidies made EVs price-competitive with ICE vehicles.",
         "impact": "positive", "source": "Electric Vehicle Association of Thailand"},
        {"country": "Indonesia", "headline": "Indonesia nickel-to-battery strategy attracts Hyundai-LG USD 1.1B joint venture",
         "summary": "The HLI Green Power battery cell plant in Karawang reached full production in 2024, producing cells that will power Hyundai's Ioniq 5 assembled locally — a milestone in Indonesia's EV supply chain ambitions.",
         "impact": "positive", "source": "ESDM Ministry Indonesia"},
    ],

    ("middle east", "energy"): [
        {"country": "Saudi Arabia", "headline": "Saudi Aramco sustains USD 121B net income as OPEC+ cuts keep oil price elevated",
         "summary": "Aramco's 2023 net income of USD 121B remains among the highest of any listed company globally, supported by OPEC+ coordinated production cuts keeping Brent crude above USD 80/barrel.",
         "impact": "positive", "source": "Saudi Aramco Annual Report"},
        {"country": "UAE", "headline": "Masdar reaches 20GW renewable portfolio as UAE accelerates clean energy pivot",
         "summary": "Abu Dhabi's Masdar clean energy company has deployed solar and wind projects across 40 countries totalling 20GW, positioning UAE as a clean energy export economy alongside its oil revenues.",
         "impact": "positive", "source": "Masdar Press Release"},
    ],
}


# ─────────────────────────────────────────────────────────────────────────────
# Web Scraping Tool — Deep technical intelligence
# ─────────────────────────────────────────────────────────────────────────────
RICH_SCRAPE_DATA: Dict[Tuple[str, str], List[Dict]] = {
    ("middle east", "automotive"): [
        {"country": "Saudi Arabia", "headline": "[DEEP RESEARCH] Supply Chain Logistics: 12% Cost Reduction via King Abdullah Port", 
         "summary": "Technical analysis of port clearing efficiency reveals a 12% reduction in import lead times for automotive components due to new digital customs integration at KAEC.",
         "impact": "positive", "source": "Logistics Deep Dive"},
        {"country": "UAE", "headline": "[DEEP RESEARCH] Aftermarket Brand Analysis: Bosch vs Denso in Dubai Free Zone", 
         "summary": "Scraped pricing data shows a 15% price premium for OEM Bosch components over regional Denso equivalents, with a 20% faster turnover rate in Dubai's Northern Emirates.",
         "impact": "neutral", "source": "Regional Price Tracker"},
    ],
    ("southeast asia", "automotive"): [
        {"country": "Thailand", "headline": "[DEEP RESEARCH] Rayong Industrial Node: Tier-3 Supplier Pricing Dynamics",
         "summary": "Deep scrape of local factory-gate prices indicates raw material cost inflation of 8% for aluminum-based brake components in the Rayong cluster.",
         "impact": "negative", "source": "Industry Gate Intel"},
    ],
    ("north america", "electronics"): [
        {"country": "United States", "headline": "[DEEP RESEARCH] Fab Utilization Report: TSMC Arizona vs Intel Ohio",
         "summary": "Internal logistics data scraped from construction supply chains suggests a 3-month delay in tooling installation for TSMC's Phase 1, impacting initial N4 logic capacity.",
         "impact": "mixed", "source": "Fab Construction Monitor"},
    ]
}

class WebScrapingTool:
    """Simulates a deep-web scraper that finds technical industry data points."""
    async def scrape_deep_intelligence(self, topic: str, region: str) -> List[ExternalSignalRecord]:
        region_k = _region_key(region)
        topic_k  = _topic_category(topic)
        key      = (region_k, topic_k)

        rich = RICH_SCRAPE_DATA.get(key, [])
        if not rich:
            return [
                ExternalSignalRecord(
                    country=region, topic=topic, region=region,
                    headline=f"[DEEP SCRAPE] Technical insights for {topic} in {region}",
                    summary=f"Automated scraping of industry-specific forums and technical specs for {topic} reveals increasing focus on sustainability and supply chain resilience.",
                    impact="neutral", source="Deep Web Scraper", publishedAt="2024-Q4"
                )
            ]
        
        records = []
        for item in rich:
            records.append(ExternalSignalRecord(
                country=item["country"], topic=topic, region=region,
                headline=item["headline"], summary=item["summary"],
                impact=item["impact"], source=item["source"], publishedAt="2024-Q4"
            ))
        return records


class SignalDataTool:
    async def load_signals(
        self, topic: str, region: str, key_markets: List[str], search_hints: List[str]
    ) -> List[ExternalSignalRecord]:
        region_k = _region_key(region)
        topic_k  = _topic_category(topic)
        key      = (region_k, topic_k)

        rich = RICH_SIGNALS.get(key, [])

        if rich:
            records = []
            for item in rich:
                records.append(ExternalSignalRecord(
                    country=item["country"],
                    topic=topic,
                    region=region,
                    headline=item["headline"],
                    summary=item["summary"],
                    impact=item["impact"],
                    source=item["source"],
                    publishedAt="2024-Q4",
                ))
            return records
        else:
            # Generic fallback
            markets = _region_to_markets(region)
            return [
                ExternalSignalRecord(
                    country=country,
                    topic=topic,
                    region=region,
                    headline=f"Market momentum detected for {topic} in {country}",
                    summary=f"Trade intelligence signals indicate notable activity in {topic} within {country}, driven by regional economic shifts in {region}.",
                    impact="positive",
                    source=f"Regional Signal DB — {region}",
                    publishedAt="2024-Q4",
                )
                for country in markets[:3]
            ]
