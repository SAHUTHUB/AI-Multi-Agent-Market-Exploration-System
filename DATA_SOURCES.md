# 📊 Data Sources & Intelligence Strategy

This document provides a technical overview of the data architecture, sourcing strategies, and resilience mechanisms implemented in the **AI Multi-Agent Market Exploration System**.

---

## 1. Hybrid Data Architecture

The system is engineered to leverage a mix of structured internal knowledge and dynamic external signals to provide a holistic and contextualized market view.

| Source | Type | Integration Tool | Purpose |
| :--- | :--- | :--- | :--- |
| **Rich Internal Data** | Structured Library | `MarketDataTool` | Provides "Ground Truth" market baselines, industry players, and regional visions. |
| **Finlight v2 API** | Live / Dynamic | `FinlightNewsTool` | Primary source for high-quality financial news and global market headlines. |
| **Deep Web Scraper** | Live / Technical | `WebScrapingTool` | Deep-dives into technical data points (e.g., specific factory-gate price trends or logistics delays). |
| **Rich Mocks** | Structured / Testing | `SignalDataTool` | Provides high-fidelity curated data for demo and testing purposes. |

### Data Flow Overview

```mermaid
graph LR
    %% Define Styles
    classDef agent fill:#f59e0b,stroke:#b45309,stroke-width:2px,color:#fff
    classDef tool fill:#94a3b8,stroke:#475569,stroke-dasharray: 5 5,color:#fff
    classDef source fill:#e1f5fe,stroke:#01579b,stroke-width:2px

    subgraph "Knowledge Retrieval (Step 2)"
        Agent2[Market Agent] --- Tool1[MarketDataTool]
        Tool1 --- S1[(Rich Ground Truth Library)]
    end

    subgraph "Signal Retrieval (Step 3)"
        Agent3[News Agent] --- Tool2[Signal Fetcher]
        Tool2 --- P1[Finlight v2 API]
        Tool2 --- P2[Deep Web Scraper]
        Tool2 --- P3[Rich Mock Signals]
    end

    %% Assign Classes
    class Agent2,Agent3 agent
    class Tool1,Tool2 tool
    class S1,P1,P2,P3 source
```

---

## 2. Intelligence Strategies & Implementation

### 🏥 Rich Mock Data Library
Instead of simple generic strings, the system uses a **Curated Market Library** (`RICH_MOCK_DATA`) keyed by `(region, topic_category)`.
*   **Categories**: Automotive, EV, Electronics, Agriculture, Textiles, Pharma, Energy, etc.
*   **Depth**: Includes specific figures (e.g., *"USD 4.2B market size"*), competitor names (*"Al-Jomaih AutoWorld"*), and regional policy links (*"Vision 2030"*).
*   **Result**: Allows the LLM to perform high-fidelity reasoning even in "Mock Mode".

### 🌊 Finlight v2 News Integration
The **Finlight News API** provides real-time financial articles.
*   **Keyword Optimization**: The system uses `searchHints` (extracted from the user's intent) to query the API for maximum relevance.
*   **Localization**: When a region is detected, the system maps it to specific **ISO Country Codes** to filter news by geography.

### 🕵️‍♂️ Deep Web Scraper (Deep Intelligence)
The `WebScrapingTool` simulates an "Active Intelligent Agent" that goes beyond general news.
*   **Targeting**: Focusing on technical insights like *"Logistics Cost Reductions"* or *"Tier-3 Supplier Pricing Dynamics"*.
*   **Output**: Returns `[DEEP RESEARCH]` records that provide a higher level of analytical detail than standard news headlines.

---

## 3. Resilience & Fallback (Graceful Degradation)

To maintain functionality under API constraints or connectivity issues, a **Waterfall Failover Logic** is implemented in the `NewsSignalAgent`:

```mermaid
graph TD
    Start([Signal Retrieval Request]) --> InputSources{Check Selected<br/>Data Sources}
    
    %% Pathway 1: API
    InputSources -- API --> FetchAPI[Attempt Finlight v2 API]
    FetchAPI --> API_Success{Success?}
    API_Success -- Yes --> Normalize[Normalize to Unified Schema]
    
    %% Pathway 2: Scraper
    InputSources -- Scrape --> Scrape[Deep Intelligence Scraper]
    
    %% Pathway 3: Mock
    InputSources -- Mock --> LoadMock[Load Rich Mock Library]
    
    %% Fallback Logic
    API_Success -- No --> LogWarning[Log API Error in Trace]
    LogWarning --> LoadMock
    
    Normalize --> End([Return Analysis-Ready Signals])

    %% Styling
    classDef action fill:#bbf,stroke:#333,stroke-width:1px;
    classDef decision fill:#f9f,stroke:#333,stroke-width:2px,stroke-dasharray: 5 5;
    classDef endnode fill:#ff9,stroke:#333,stroke-width:2px;
    
    class FetchAPI,Scrape,Normalize,LoadMock action;
    class InputSources,API_Success decision;
    class Start,End endnode;
```

---

## ⚙️ Configuration

To enable the full intelligence stack, ensure these environment variables are configured:

- **GROQ_API_KEY**: Required for Agent LLM reasoning.
- **FINLIGHT_API_KEY**: Required for live financial news retrieval.

---
*Note: This data strategy focuses on "Actionable Industrial Intelligence" rather than generic information retrieval.*
