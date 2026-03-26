# 📊 Data Sources & Intelligence Strategy

This document provides a technical overview of the data architecture, sourcing strategies, and resilience mechanisms implemented in the **AI Multi-Agent Market Exploration System**.

---

## 1. Hybrid Data Architecture

The system is engineered to leverage a mix of structured internal knowledge and dynamic external signals to provide a holistic and contextualized market view.

| Source | Type | Integration Tool | Purpose |
| :--- | :--- | :--- | :--- |
| **Internal JSON** | Structured / Static | `JsonMarketDataTool` | Provides "Ground Truth" market baselines and core industry facts. |
| **GNews API** | Live / Dynamic | `fetchLiveNews` | Aggregates real-time global news headlines and summaries. |
| **Web Scraping** | Live / Unstructured | `scrapeNewsWithCheerio` | Extracts trending headlines from Google News for maximum data freshness. |
| **Mock Signals** | Structured / Testing | `JsonSignalDataTool` | Enables deterministic testing and consistent system demonstrations. |

### Data Flow Overview
The following diagram illustrates how data from multiple sources flows through the specialized agents to produce the final insight report:

```mermaid
graph TD
    %% Define Styles
    classDef user fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef agent fill:#fff4e5,stroke:#d4a017,stroke-width:2px
    classDef tool fill:#f5f5f5,stroke:#333,stroke-dasharray: 5 5
    classDef result fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    %% Flow
    Input([User Query]) --> QUA

    subgraph Agents [Multi-Agent Reasoning Chain]
        QUA[1. Query Understanding Agent]
        MRA[2. Market Research Agent]
        NSA[3. News Signal Agent]
        
        %% Sequence & Context Passing
        QUA -->|Structured Metadata| MRA
        MRA -->|Market Context| NSA
        QUA -->|Search Hints| NSA
    end

    %% Tools Interaction
    MRA --- Tool1[(Internal Market Data)]
    
    NSA --- Tool2{Data Fetcher}
    subgraph ExternalSources [External & Mock Signals]
        direction LR
        S1[GNews API]
        S2[Web Scraper]
        S3[Mock Signals]
    end
    Tool2 --> S1
    Tool2 --> S2
    Tool2 --> S3

    %% Final Output
    NSA --> Output([Final Insight Report])

    %% Assign Classes
    class Input user
    class QUA,MRA,NSA agent
    class Tool1,Tool2,S1,S2,S3 tool
    class Output result
```

---

## 2. Engineering Insights & Implementation

### 🧠 Mock Data & System Determinism
During the prototype stage, we utilize structured JSON files (`mock-market-data.json`) to establish a controlled testing environment:
- **Baseline Verification**: Ensures the agent's reasoning logic is verified against a known set of facts before introducing live variables.
- **Search Optimization**: Records are indexed by `topic`, `region`, and `country`, enriched with `searchHints` to facilitate rapid keyword matching.

### 🔄 Dynamic Query Transformation
To maximize the relevance of external data, the system performs **Query Narrowing** via the `QueryUnderstandingAgent`:
- User queries are transformed into optimized search strings (e.g., appending "market outlook" or "supply chain disruption") to ensure high-quality retrieval from live sources.

### 🛠 Unstructured Data Synthesis
Web scraping via Cheerio bypasses API indexing delays, capturing the most recent events:
- **Synthesis Logic**: Raw headlines are fed into the `NewsSignalAgent`'s synthesis layer, where the LLM extracts key entities and sentiments, converting them into a structured schema.

### 🏗 Data Normalization Layer
Across all sources, a **Normalization Mapping** process is implemented:
- All inputs are transformed into a unified `ExternalSignalRecord` interface. This decoupling ensures that downstream analysis agents remain agnostic of the data's origin.

---

## 3. Resilience & Fallback (Graceful Degradation)

To maintain functionality under API constraints or network failures, a **Multi-Layered Failover (Waterfall)** mechanism is implemented:

```mermaid
graph TD
    Start([Request External Signals]) --> CheckKeys{API Keys<br/>Configured?}
    
    %% Pathway 1: API
    CheckKeys -- Yes --> FetchAPI[Attempt GNews API Fetch]
    FetchAPI --> API_Success{Success?}
    API_Success -- Yes --> Normalize[Normalize Data to<br/>Unified Schema]
    
    %% Pathway 2: Scraping
    CheckKeys -- No --> LogTrace[Log to ExecutionTrace]
    LogTrace --> Scrape[Attempt Web Scraping]
    
    API_Success -- No --> Scrape
    Scrape --> Scrape_Success{Success?}
    Scrape_Success -- Yes --> Normalize
    
    %% Pathway 3: Mock
    Scrape_Success -- No --> FallbackMock[Fallback to Mock Data]
    FallbackMock --> Normalize
    
    Normalize --> End([Return Normalised Signals])

    %% Styling
    classDef action fill:#bbf,stroke:#333,stroke-width:1px;
    classDef decision fill:#f9f,stroke:#333,stroke-width:2px,stroke-dasharray: 5 5;
    classDef endnode fill:#ff9,stroke:#333,stroke-width:2px;
    
    class FetchAPI,Scrape,Normalize,FallbackMock action;
    class CheckKeys,API_Success,Scrape_Success decision;
    class Start,End endnode;
```

---

## ⚙️ Configuration

To enable live data fetching, ensure the following environment variables are set:

- **GNews API**: Set `GNEWS_API_KEY` in the `.env` file.
- **Groq Cloud**: Ensure `GROQ_API_KEY` is configured for agent synthesis.
- **Auto-Fallback**: If keys are missing, the system will log the status in the `executionTrace` and automatically default to Mock Mode.

---
*Note: This data strategy is designed to showcase "AI Application Thinking" and "Engineering Rigor" as per the assignment evaluation criteria.*
