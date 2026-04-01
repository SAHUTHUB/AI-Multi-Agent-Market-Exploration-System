from pydantic import BaseModel, ConfigDict
from typing import List, Literal, Optional

ImpactType = Literal['positive', 'negative', 'mixed', 'neutral']
ConfidenceType = Literal['high', 'medium', 'low']

# --- Query Understanding ---

class QuerySummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    topic: str
    region: str
    intent: str
    informationNeeded: List[str]
    searchHints: List[str]

# --- Market Research ---

class EvidenceRecord(BaseModel):
    country: str
    source: str
    headline: Optional[str] = None

class MarketContext(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    overview: str
    keyMarkets: List[str]
    industryContext: List[str]
    evidence: List[EvidenceRecord]

class MarketDataRecord(BaseModel):
    country: str
    topic: str
    region: str
    overviewPoints: List[str]
    industrySignals: List[str]
    source: str

# --- News Signal ---

class ExternalSignalRecord(BaseModel):
    country: str
    topic: str
    region: str
    headline: str
    summary: str
    impact: ImpactType
    source: str
    publishedAt: str

class RecentDevelopment(BaseModel):
    market: str
    headline: str
    summary: str
    impact: ImpactType
    confidence: ConfidenceType
    source: str
    publishedAt: str

class SignalAnalysis(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    recentDevelopments: List[RecentDevelopment]
    regionalSignals: List[str]
    overallInsight: str
    evidence: List[EvidenceRecord]

# --- Workflow Integration ---

class MarketInsightWorkflowInput(BaseModel):
    query: str
    dataSource: Optional[List[Literal['api', 'scrape', 'mock']]] = ["mock"]

class MarketInsightWorkflowResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    topic: str
    region: str
    keyMarkets: List[str]
    marketInsights: str
    industryContext: List[str]
    recentDevelopments: List[RecentDevelopment]
    regionalSignals: List[str]
    overallInsight: str
    evidence: List[EvidenceRecord]
    executionTrace: List[str]
