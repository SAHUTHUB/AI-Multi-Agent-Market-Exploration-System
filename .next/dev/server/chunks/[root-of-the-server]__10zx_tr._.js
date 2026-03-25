module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/Documents/GitHub/AI-AGENT/lib/agents/query-understanding.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "QueryUnderstandingAgent",
    ()=>QueryUnderstandingAgent
]);
const DEFAULT_TOPIC = 'General market exploration';
const DEFAULT_REGION = 'Global';
const DEFAULT_INTENT = 'market_exploration';
function defaultBuildPrompt(query) {
    return [
        {
            role: 'system',
            content: [
                'You are a query understanding agent.',
                'Your job is to convert a user query into strict JSON.',
                'Return only JSON.',
                'Required fields:',
                '- topic: string',
                '- region: string',
                '- intent: string',
                '- informationNeeded: string[]',
                '- searchHints: string[]',
                'Do not include markdown or explanation.'
            ].join('\n')
        },
        {
            role: 'user',
            content: [
                'Parse this user query into structured JSON.',
                `Query: ${query}`
            ].join('\n')
        }
    ];
}
function cleanString(value, fallback) {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
}
function cleanStringArray(value, fallback = []) {
    if (!Array.isArray(value)) return fallback;
    return value.filter((item)=>typeof item === 'string').map((item)=>item.trim()).filter(Boolean);
}
function buildFallbackSearchHints(query, topic, region) {
    const safeQuery = query.trim();
    const hints = [
        `${topic} ${region} market insights`,
        `${topic} ${region} recent developments`,
        safeQuery
    ];
    return [
        ...new Set(hints.map((item)=>item.trim()).filter(Boolean))
    ];
}
function normalizeQuerySummary(raw, query) {
    const topic = cleanString(raw?.topic, DEFAULT_TOPIC);
    const region = cleanString(raw?.region, DEFAULT_REGION);
    const intent = cleanString(raw?.intent, DEFAULT_INTENT);
    const informationNeeded = cleanStringArray(raw?.informationNeeded).length > 0 ? cleanStringArray(raw?.informationNeeded) : [
        'market insights',
        'recent developments'
    ];
    const searchHints = cleanStringArray(raw?.searchHints).length > 0 ? cleanStringArray(raw?.searchHints) : buildFallbackSearchHints(query, topic, region);
    return {
        topic,
        region,
        intent,
        informationNeeded,
        searchHints
    };
}
class QueryUnderstandingAgent {
    provider;
    buildPrompt;
    constructor(deps){
        this.provider = deps.provider;
        this.buildPrompt = deps.buildPrompt ?? defaultBuildPrompt;
    }
    async run(query) {
        const normalizedQuery = query.trim();
        if (!normalizedQuery) {
            throw new Error('QueryUnderstandingAgent: query is required');
        }
        const messages = this.buildPrompt(normalizedQuery);
        const raw = await this.provider.generateJson({
            messages,
            temperature: 0,
            maxTokens: 500
        });
        return normalizeQuerySummary(raw, normalizedQuery);
    }
}
}),
"[project]/Documents/GitHub/AI-AGENT/lib/agents/market-research.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MarketResearchAgent",
    ()=>MarketResearchAgent
]);
function defaultBuildPrompt(args) {
    const { querySummary, records } = args;
    return [
        {
            role: 'system',
            content: [
                'You are a market research agent.',
                'Your job is to summarize market context using ONLY the provided source data.',
                'Do not invent unsupported facts.',
                'Return only strict JSON.',
                'Required fields:',
                '- overview: string',
                '- keyMarkets: string[]',
                '- industryContext: string[]'
            ].join('\n')
        },
        {
            role: 'user',
            content: [
                'Build a market context summary from the data below.',
                `Topic: ${querySummary.topic}`,
                `Region: ${querySummary.region}`,
                `Intent: ${querySummary.intent}`,
                `Information needed: ${querySummary.informationNeeded.join(', ')}`,
                'Market source records:',
                JSON.stringify(records, null, 2)
            ].join('\n\n')
        }
    ];
}
function cleanString(value, fallback) {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
}
function cleanStringArray(value, fallback = []) {
    if (!Array.isArray(value)) return fallback;
    return value.filter((item)=>typeof item === 'string').map((item)=>item.trim()).filter(Boolean);
}
function buildFallbackOverview(records, topic, region) {
    if (records.length === 0) {
        return `No structured market data was found for ${topic} in ${region}.`;
    }
    const countries = [
        ...new Set(records.map((item)=>item.country))
    ];
    return `${region} shows relevant market activity for ${topic}, with notable context across ${countries.join(', ')}.`;
}
function buildFallbackIndustryContext(records) {
    const merged = records.flatMap((item)=>[
            ...item.overviewPoints,
            ...item.industrySignals
        ]);
    return [
        ...new Set(merged)
    ].filter(Boolean).slice(0, 6);
}
function buildEvidence(records) {
    return records.map((item)=>({
            country: item.country,
            source: item.source
        }));
}
function normalizeMarketContext(raw, records, querySummary) {
    const fallbackOverview = buildFallbackOverview(records, querySummary.topic, querySummary.region);
    const keyMarkets = cleanStringArray(raw?.keyMarkets).length > 0 ? [
        ...new Set(cleanStringArray(raw?.keyMarkets))
    ] : [
        ...new Set(records.map((item)=>item.country))
    ];
    const industryContext = cleanStringArray(raw?.industryContext).length > 0 ? cleanStringArray(raw?.industryContext) : buildFallbackIndustryContext(records);
    return {
        overview: cleanString(raw?.overview, fallbackOverview),
        keyMarkets,
        industryContext,
        evidence: buildEvidence(records)
    };
}
class MarketResearchAgent {
    provider;
    marketDataTool;
    buildPrompt;
    constructor(deps){
        this.provider = deps.provider;
        this.marketDataTool = deps.marketDataTool;
        this.buildPrompt = deps.buildPrompt ?? defaultBuildPrompt;
    }
    async run(querySummary) {
        const records = await this.marketDataTool.loadMarketData({
            topic: querySummary.topic,
            region: querySummary.region,
            searchHints: querySummary.searchHints
        });
        if (records.length === 0) {
            return normalizeMarketContext({}, records, querySummary);
        }
        const messages = this.buildPrompt({
            querySummary,
            records
        });
        const raw = await this.provider.generateJson({
            messages,
            temperature: 0,
            maxTokens: 700
        });
        return normalizeMarketContext(raw, records, querySummary);
    }
}
}),
"[project]/Documents/GitHub/AI-AGENT/lib/agents/news-signal.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NewsSignalAgent",
    ()=>NewsSignalAgent
]);
function defaultBuildPrompt(args) {
    const { querySummary, marketContext, records } = args;
    return [
        {
            role: 'system',
            content: [
                'You are a news and external signal analysis agent.',
                'Your job is to analyze the provided signal records only.',
                'Do not invent unsupported facts.',
                'Return only strict JSON.',
                'Required fields:',
                '- recentDevelopments: array of objects with market, headline, summary, impact, publishedAt',
                '- regionalSignals: string[]',
                '- overallInsight: string'
            ].join('\n')
        },
        {
            role: 'user',
            content: [
                'Analyze the provided regional signals.',
                `Topic: ${querySummary.topic}`,
                `Region: ${querySummary.region}`,
                `Intent: ${querySummary.intent}`,
                `Key markets: ${marketContext.keyMarkets.join(', ')}`,
                'Market context:',
                JSON.stringify(marketContext, null, 2),
                'Signal source records:',
                JSON.stringify(records, null, 2)
            ].join('\n\n')
        }
    ];
}
function cleanString(value, fallback) {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
}
function cleanImpact(value) {
    if (value === 'positive' || value === 'negative' || value === 'mixed' || value === 'neutral') {
        return value;
    }
    return 'neutral';
}
function normalizeRecentDevelopments(raw, fallback) {
    if (!Array.isArray(raw)) return fallback;
    const normalized = raw.map((item)=>{
        if (!item || typeof item !== 'object') return null;
        const record = item;
        return {
            market: cleanString(record.market, 'Unknown'),
            headline: cleanString(record.headline, 'Untitled development'),
            summary: cleanString(record.summary, ''),
            impact: cleanImpact(record.impact),
            publishedAt: cleanString(record.publishedAt, 'Unknown')
        };
    }).filter((item)=>item !== null);
    return normalized.length > 0 ? normalized : fallback;
}
function cleanStringArray(value, fallback = []) {
    if (!Array.isArray(value)) return fallback;
    const normalized = value.filter((item)=>typeof item === 'string').map((item)=>item.trim()).filter(Boolean);
    return normalized.length > 0 ? normalized : fallback;
}
function buildFallbackRecentDevelopments(records) {
    return records.map((item)=>({
            market: item.country,
            headline: item.headline,
            summary: item.summary,
            impact: item.impact,
            publishedAt: item.publishedAt
        }));
}
function buildFallbackRegionalSignals(records) {
    const signals = records.map((item)=>`${item.country}: ${item.headline} (${item.impact})`);
    return [
        ...new Set(signals)
    ].slice(0, 6);
}
function buildFallbackOverallInsight(records, querySummary, marketContext) {
    if (records.length === 0) {
        return `No significant external signals were found for ${querySummary.topic} in ${querySummary.region}.`;
    }
    const countries = [
        ...new Set(records.map((item)=>item.country))
    ];
    const marketsText = marketContext.keyMarkets.length > 0 ? marketContext.keyMarkets.join(', ') : countries.join(', ');
    return `${querySummary.region} shows active external developments relevant to ${querySummary.topic}, especially across ${marketsText}.`;
}
function buildEvidence(records) {
    return records.map((item)=>({
            country: item.country,
            source: item.source,
            headline: item.headline
        }));
}
function normalizeSignalAnalysis(raw, records, querySummary, marketContext) {
    const fallbackRecentDevelopments = buildFallbackRecentDevelopments(records);
    const fallbackRegionalSignals = buildFallbackRegionalSignals(records);
    const fallbackOverallInsight = buildFallbackOverallInsight(records, querySummary, marketContext);
    return {
        recentDevelopments: normalizeRecentDevelopments(raw?.recentDevelopments, fallbackRecentDevelopments),
        regionalSignals: cleanStringArray(raw?.regionalSignals, fallbackRegionalSignals),
        overallInsight: cleanString(raw?.overallInsight, fallbackOverallInsight),
        evidence: buildEvidence(records)
    };
}
class NewsSignalAgent {
    provider;
    signalDataTool;
    buildPrompt;
    constructor(deps){
        this.provider = deps.provider;
        this.signalDataTool = deps.signalDataTool;
        this.buildPrompt = deps.buildPrompt ?? defaultBuildPrompt;
    }
    async run(querySummary, marketContext) {
        const records = await this.signalDataTool.loadSignals({
            topic: querySummary.topic,
            region: querySummary.region,
            keyMarkets: marketContext.keyMarkets,
            searchHints: querySummary.searchHints
        });
        if (records.length === 0) {
            return normalizeSignalAnalysis({}, records, querySummary, marketContext);
        }
        const messages = this.buildPrompt({
            querySummary,
            marketContext,
            records
        });
        const raw = await this.provider.generateJson({
            messages,
            temperature: 0,
            maxTokens: 900
        });
        return normalizeSignalAnalysis(raw, records, querySummary, marketContext);
    }
}
}),
"[project]/Documents/GitHub/AI-AGENT/lib/orchestrator/market-insight.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MarketInsightOrchestrator",
    ()=>MarketInsightOrchestrator
]);
function dedupeEvidence(evidence) {
    const seen = new Set();
    return evidence.filter((item)=>{
        const key = 'headline' in item ? `${item.country}|${item.source}|${item.headline}` : `${item.country}|${item.source}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}
function buildFinalResult(args) {
    const { querySummary, marketContext, signalAnalysis, executionTrace } = args;
    return {
        topic: querySummary.topic,
        region: querySummary.region,
        keyMarkets: marketContext.keyMarkets,
        marketInsights: marketContext.overview,
        industryContext: marketContext.industryContext,
        recentDevelopments: signalAnalysis.recentDevelopments,
        regionalSignals: signalAnalysis.regionalSignals,
        overallInsight: signalAnalysis.overallInsight,
        evidence: dedupeEvidence([
            ...marketContext.evidence,
            ...signalAnalysis.evidence
        ]),
        executionTrace
    };
}
class MarketInsightOrchestrator {
    queryUnderstandingAgent;
    marketResearchAgent;
    newsSignalAgent;
    constructor(deps){
        this.queryUnderstandingAgent = deps.queryUnderstandingAgent;
        this.marketResearchAgent = deps.marketResearchAgent;
        this.newsSignalAgent = deps.newsSignalAgent;
    }
    async run(input) {
        const query = input.query?.trim();
        if (!query) {
            throw new Error('MarketInsightOrchestrator: query is required');
        }
        const executionTrace = [
            'workflow_started'
        ];
        const querySummary = await this.queryUnderstandingAgent.run(query);
        executionTrace.push('query_understanding_completed');
        const marketContext = await this.marketResearchAgent.run(querySummary);
        executionTrace.push('market_research_completed');
        const signalAnalysis = await this.newsSignalAgent.run(querySummary, marketContext);
        executionTrace.push('news_signal_analysis_completed');
        const result = buildFinalResult({
            querySummary,
            marketContext,
            signalAnalysis,
            executionTrace
        });
        result.executionTrace.push('workflow_completed');
        return result;
    }
}
}),
"[project]/Documents/GitHub/AI-AGENT/lib/providers/llm.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GroqProvider",
    ()=>GroqProvider
]);
function getEnv(name, fallback) {
    const value = process.env[name] ?? fallback;
    if (!value) {
        throw new Error(`GroqProvider: missing environment variable ${name}`);
    }
    return value;
}
function extractJsonText(content) {
    const trimmed = content.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        return trimmed;
    }
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
        return fencedMatch[1].trim();
    }
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return trimmed.slice(firstBrace, lastBrace + 1);
    }
    throw new Error('GroqProvider: response did not contain valid JSON text');
}
class GroqProvider {
    apiKey;
    model;
    baseUrl;
    constructor(args){
        this.apiKey = args?.apiKey ?? getEnv('GROQ_API_KEY');
        this.model = args?.model ?? process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant';
        this.baseUrl = args?.baseUrl ?? process.env.GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1';
    }
    async generateJson(args) {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: args.messages,
                temperature: args.temperature ?? 0,
                max_completion_tokens: args.maxTokens ?? 800,
                response_format: {
                    type: 'json_object'
                }
            })
        });
        const payload = await response.json();
        if (!response.ok) {
            throw new Error(`GroqProvider: request failed with status ${response.status}${payload?.error?.message ? ` - ${payload.error.message}` : ''}`);
        }
        const content = payload?.choices?.[0]?.message?.content;
        if (!content || typeof content !== 'string') {
            throw new Error('GroqProvider: empty model response');
        }
        const jsonText = extractJsonText(content);
        try {
            return JSON.parse(jsonText);
        } catch (error) {
            throw new Error('GroqProvider: failed to parse JSON response');
        }
    }
}
}),
"[project]/Documents/GitHub/AI-AGENT/lib/providers/mock.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MockProvider",
    ()=>MockProvider
]);
class MockProvider {
    async generateJson(args) {
        const promptText = args.messages.map((m)=>m.content).join(' ');
        // QueryUnderstandingAgent
        if (promptText.includes('Parse this user query into structured JSON')) {
            return {
                topic: 'Agricultural products',
                region: 'Southeast Asia',
                intent: 'market_exploration',
                informationNeeded: [
                    'market insights',
                    'recent developments'
                ],
                searchHints: [
                    'Agricultural products Southeast Asia market insights',
                    'Agricultural products Southeast Asia recent developments'
                ]
            };
        }
        // MarketResearchAgent
        if (promptText.includes('Build a market context summary')) {
            return {
                overview: 'Southeast Asia is an important agricultural production and export region.',
                keyMarkets: [
                    'Thailand',
                    'Vietnam',
                    'Indonesia'
                ],
                industryContext: [
                    'Strong agricultural export activity',
                    'Growing regional food supply chain capacity',
                    'Regional trade continues to support market relevance'
                ]
            };
        }
        // NewsSignalAgent
        if (promptText.includes('Analyze the provided regional signals')) {
            return {
                recentDevelopments: [
                    {
                        market: 'Vietnam',
                        headline: 'Agricultural export momentum remains strong',
                        summary: 'Recent reports suggest export activity is supported by resilient food demand.',
                        impact: 'positive',
                        publishedAt: '2026-03-10'
                    },
                    {
                        market: 'Indonesia',
                        headline: 'Import policy discussions may affect trade flows',
                        summary: 'New policy discussions may reshape agricultural import and export allocation.',
                        impact: 'mixed',
                        publishedAt: '2026-03-11'
                    }
                ],
                regionalSignals: [
                    'Food demand remains supportive for regional exporters',
                    'Policy shifts may change trade allocation across the region'
                ],
                overallInsight: 'The region remains active, with supportive demand trends and policy-sensitive trade flows.'
            };
        }
        return {};
    }
}
}),
"[project]/Documents/GitHub/AI-AGENT/lib/data/mock-market-data.json.[json].cjs [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = [
    {
        "country": "Thailand",
        "topic": "Agricultural products",
        "region": "Southeast Asia",
        "overviewPoints": [
            "Thailand is a major regional agricultural exporter",
            "The country supports strong food processing and export activity"
        ],
        "industrySignals": [
            "Strong processing infrastructure",
            "Regional trade continues to support demand"
        ],
        "source": "mock-market-data.json"
    },
    {
        "country": "Vietnam",
        "topic": "Agricultural products",
        "region": "Southeast Asia",
        "overviewPoints": [
            "Vietnam shows strong export momentum in food-related sectors",
            "Agricultural trade remains important to regional supply chains"
        ],
        "industrySignals": [
            "Growing demand from overseas markets",
            "Export-oriented production remains relevant"
        ],
        "source": "mock-market-data.json"
    },
    {
        "country": "Indonesia",
        "topic": "Agricultural products",
        "region": "Southeast Asia",
        "overviewPoints": [
            "Indonesia has large domestic and regional agricultural relevance",
            "The market supports broad agri-supply activity"
        ],
        "industrySignals": [
            "Growing agri-supply chain activity",
            "Domestic scale adds market resilience"
        ],
        "source": "mock-market-data.json"
    }
];
}),
"[project]/Documents/GitHub/AI-AGENT/lib/tools/market-data-tool.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "JsonMarketDataTool",
    ()=>JsonMarketDataTool
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$AI$2d$AGENT$2f$lib$2f$data$2f$mock$2d$market$2d$data$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/GitHub/AI-AGENT/lib/data/mock-market-data.json.[json].cjs [app-route] (ecmascript)");
;
function normalizeText(value) {
    return value.trim().toLowerCase();
}
function matchesTopic(record, topic) {
    return normalizeText(record.topic) === normalizeText(topic);
}
function matchesRegion(record, region) {
    return normalizeText(record.region) === normalizeText(region);
}
function matchesSearchHints(record, searchHints) {
    if (searchHints.length === 0) return false;
    const haystack = [
        record.country,
        record.topic,
        record.region,
        ...record.overviewPoints,
        ...record.industrySignals
    ].join(' ').toLowerCase();
    return searchHints.some((hint)=>hint.toLowerCase().split(/\s+/).filter(Boolean).every((token)=>haystack.includes(token)));
}
function dedupeRecords(records) {
    const seen = new Set();
    return records.filter((record)=>{
        const key = `${record.country}|${record.topic}|${record.region}|${record.source}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}
class JsonMarketDataTool {
    records;
    constructor(records){
        this.records = records ?? __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$AI$2d$AGENT$2f$lib$2f$data$2f$mock$2d$market$2d$data$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"];
    }
    async loadMarketData(args) {
        const { topic, region, searchHints } = args;
        const strictMatches = this.records.filter((record)=>matchesTopic(record, topic) && matchesRegion(record, region));
        if (strictMatches.length > 0) {
            return dedupeRecords(strictMatches);
        }
        const regionMatches = this.records.filter((record)=>matchesRegion(record, region));
        if (regionMatches.length > 0) {
            return dedupeRecords(regionMatches);
        }
        const hintMatches = this.records.filter((record)=>matchesSearchHints(record, searchHints));
        return dedupeRecords(hintMatches);
    }
}
}),
"[project]/Documents/GitHub/AI-AGENT/lib/data/mock-signal-data.json.[json].cjs [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = [
    {
        "country": "Thailand",
        "topic": "Agricultural products",
        "region": "Southeast Asia",
        "headline": "Investment in agricultural technology continues",
        "summary": "Processing infrastructure and agri-tech investment may improve productivity and export competitiveness.",
        "impact": "positive",
        "source": "mock-signal-data.json",
        "publishedAt": "2026-03-09"
    },
    {
        "country": "Vietnam",
        "topic": "Agricultural products",
        "region": "Southeast Asia",
        "headline": "Agricultural export momentum remains strong",
        "summary": "Recent reports suggest export activity is supported by resilient food demand and regional trade flows.",
        "impact": "positive",
        "source": "mock-signal-data.json",
        "publishedAt": "2026-03-10"
    },
    {
        "country": "Indonesia",
        "topic": "Agricultural products",
        "region": "Southeast Asia",
        "headline": "Import policy discussions may affect trade flows",
        "summary": "New policy discussions may reshape agricultural import and export allocation across the region.",
        "impact": "mixed",
        "source": "mock-signal-data.json",
        "publishedAt": "2026-03-11"
    }
];
}),
"[project]/Documents/GitHub/AI-AGENT/lib/tools/signal-data-tool.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "JsonSignalDataTool",
    ()=>JsonSignalDataTool
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$AI$2d$AGENT$2f$lib$2f$data$2f$mock$2d$signal$2d$data$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/GitHub/AI-AGENT/lib/data/mock-signal-data.json.[json].cjs [app-route] (ecmascript)");
;
function normalizeText(value) {
    return value.trim().toLowerCase();
}
function matchesTopic(record, topic) {
    return normalizeText(record.topic) === normalizeText(topic);
}
function matchesRegion(record, region) {
    return normalizeText(record.region) === normalizeText(region);
}
function matchesKeyMarkets(record, keyMarkets) {
    if (keyMarkets.length === 0) return false;
    return keyMarkets.some((market)=>normalizeText(market) === normalizeText(record.country));
}
function matchesSearchHints(record, searchHints) {
    if (searchHints.length === 0) return false;
    const haystack = [
        record.country,
        record.topic,
        record.region,
        record.headline,
        record.summary,
        record.impact
    ].join(' ').toLowerCase();
    return searchHints.some((hint)=>hint.toLowerCase().split(/\s+/).filter(Boolean).every((token)=>haystack.includes(token)));
}
function dedupeRecords(records) {
    const seen = new Set();
    return records.filter((record)=>{
        const key = [
            record.country,
            record.topic,
            record.region,
            record.headline,
            record.source,
            record.publishedAt
        ].join('|');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}
function sortNewestFirst(records) {
    return [
        ...records
    ].sort((a, b)=>{
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
}
class JsonSignalDataTool {
    records;
    constructor(records){
        this.records = records ?? __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$AI$2d$AGENT$2f$lib$2f$data$2f$mock$2d$signal$2d$data$2e$json$2e5b$json$5d2e$cjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"];
    }
    async loadSignals(args) {
        const { topic, region, keyMarkets, searchHints } = args;
        const strictMatches = this.records.filter((record)=>matchesTopic(record, topic) && matchesRegion(record, region) && (keyMarkets.length === 0 || matchesKeyMarkets(record, keyMarkets)));
        if (strictMatches.length > 0) {
            return sortNewestFirst(dedupeRecords(strictMatches));
        }
        const regionMatches = this.records.filter((record)=>matchesRegion(record, region) && (keyMarkets.length === 0 || matchesKeyMarkets(record, keyMarkets)));
        if (regionMatches.length > 0) {
            return sortNewestFirst(dedupeRecords(regionMatches));
        }
        const hintMatches = this.records.filter((record)=>matchesSearchHints(record, searchHints));
        return sortNewestFirst(dedupeRecords(hintMatches));
    }
}
}),
"[project]/Documents/GitHub/AI-AGENT/app/api/analyze/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$AI$2d$AGENT$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/GitHub/AI-AGENT/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$AI$2d$AGENT$2f$lib$2f$agents$2f$query$2d$understanding$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/GitHub/AI-AGENT/lib/agents/query-understanding.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$AI$2d$AGENT$2f$lib$2f$agents$2f$market$2d$research$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/GitHub/AI-AGENT/lib/agents/market-research.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$AI$2d$AGENT$2f$lib$2f$agents$2f$news$2d$signal$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/GitHub/AI-AGENT/lib/agents/news-signal.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$AI$2d$AGENT$2f$lib$2f$orchestrator$2f$market$2d$insight$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/GitHub/AI-AGENT/lib/orchestrator/market-insight.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$AI$2d$AGENT$2f$lib$2f$providers$2f$llm$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/GitHub/AI-AGENT/lib/providers/llm.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$AI$2d$AGENT$2f$lib$2f$providers$2f$mock$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/GitHub/AI-AGENT/lib/providers/mock.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$AI$2d$AGENT$2f$lib$2f$tools$2f$market$2d$data$2d$tool$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/GitHub/AI-AGENT/lib/tools/market-data-tool.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$AI$2d$AGENT$2f$lib$2f$tools$2f$signal$2d$data$2d$tool$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/GitHub/AI-AGENT/lib/tools/signal-data-tool.ts [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
;
const runtime = 'nodejs';
function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}
function createProvider() {
    if (process.env.GROQ_API_KEY) {
        return new __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$AI$2d$AGENT$2f$lib$2f$providers$2f$llm$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["GroqProvider"]();
    }
    return new __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$AI$2d$AGENT$2f$lib$2f$providers$2f$mock$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MockProvider"]();
}
function createOrchestrator() {
    const provider = createProvider();
    const marketDataTool = new __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$AI$2d$AGENT$2f$lib$2f$tools$2f$market$2d$data$2d$tool$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["JsonMarketDataTool"]();
    const signalDataTool = new __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$AI$2d$AGENT$2f$lib$2f$tools$2f$signal$2d$data$2d$tool$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["JsonSignalDataTool"]();
    const queryUnderstandingAgent = new __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$AI$2d$AGENT$2f$lib$2f$agents$2f$query$2d$understanding$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["QueryUnderstandingAgent"]({
        provider
    });
    const marketResearchAgent = new __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$AI$2d$AGENT$2f$lib$2f$agents$2f$market$2d$research$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MarketResearchAgent"]({
        provider,
        marketDataTool
    });
    const newsSignalAgent = new __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$AI$2d$AGENT$2f$lib$2f$agents$2f$news$2d$signal$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NewsSignalAgent"]({
        provider,
        signalDataTool
    });
    return new __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$AI$2d$AGENT$2f$lib$2f$orchestrator$2f$market$2d$insight$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MarketInsightOrchestrator"]({
        queryUnderstandingAgent,
        marketResearchAgent,
        newsSignalAgent
    });
}
async function POST(request) {
    try {
        const body = await request.json();
        const query = body?.query;
        if (!isNonEmptyString(query)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$AI$2d$AGENT$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Query is required'
            }, {
                status: 400
            });
        }
        const orchestrator = createOrchestrator();
        const result = await orchestrator.run({
            query
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$AI$2d$AGENT$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(result, {
            status: 200
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$GitHub$2f$AI$2d$AGENT$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: message
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__10zx_tr._.js.map