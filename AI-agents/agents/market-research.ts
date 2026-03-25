import type {
  AgentMessage,
  QuerySummary,
} from './query-understanding'

export type MarketDataRecord = {
  country: string
  topic: string
  region: string
  overviewPoints: string[]
  industrySignals: string[]
  source: string
}

export type MarketContext = {
  overview: string
  keyMarkets: string[]
  industryContext: string[]
  evidence: Array<{
    country: string
    source: string
  }>
}

export type MarketResearchProvider = {
  generateJson<T>(args: {
    messages: AgentMessage[]
    temperature?: number
    maxTokens?: number
  }): Promise<T>
}

export type MarketDataTool = {
  loadMarketData(args: {
    topic: string
    region: string
    searchHints: string[]
  }): Promise<MarketDataRecord[]>
}

export type MarketResearchPromptBuilder = (args: {
  querySummary: QuerySummary
  records: MarketDataRecord[]
}) => AgentMessage[]

export type MarketResearchAgentDeps = {
  provider: MarketResearchProvider
  marketDataTool: MarketDataTool
  buildPrompt?: MarketResearchPromptBuilder
}

import { MARKET_RESEARCH_SYSTEM_PROMPT } from '../prompts/system-prompts'

function defaultBuildPrompt(args: {
  querySummary: QuerySummary
  records: MarketDataRecord[]
}): AgentMessage[] {
  const { querySummary, records } = args

  return [
    {
      role: 'system',
      content: MARKET_RESEARCH_SYSTEM_PROMPT,
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
        JSON.stringify(records, null, 2),
      ].join('\n\n'),
    },
  ]
}

function cleanString(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

function cleanStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildFallbackOverview(records: MarketDataRecord[], topic: string, region: string): string {
  if (records.length === 0) {
    return `No structured market data was found for ${topic} in ${region}.`
  }

  const countries = [...new Set(records.map((item) => item.country))]
  return `${region} shows relevant market activity for ${topic}, with notable context across ${countries.join(', ')}.`
}

function buildFallbackIndustryContext(records: MarketDataRecord[]): string[] {
  const merged = records.flatMap((item) => [
    ...item.overviewPoints,
    ...item.industrySignals,
  ])

  return [...new Set(merged)].filter(Boolean).slice(0, 6)
}

function buildEvidence(records: MarketDataRecord[]) {
  return records.map((item) => ({
    country: item.country,
    source: item.source,
  }))
}

function normalizeMarketContext(
  raw: Partial<MarketContext> | null | undefined,
  records: MarketDataRecord[],
  querySummary: QuerySummary
): MarketContext {
  const fallbackOverview = buildFallbackOverview(
    records,
    querySummary.topic,
    querySummary.region
  )

  const keyMarkets =
    cleanStringArray(raw?.keyMarkets).length > 0
      ? [...new Set(cleanStringArray(raw?.keyMarkets))]
      : [...new Set(records.map((item) => item.country))]

  const industryContext =
    cleanStringArray(raw?.industryContext).length > 0
      ? cleanStringArray(raw?.industryContext)
      : buildFallbackIndustryContext(records)

  return {
    overview: cleanString(raw?.overview, fallbackOverview),
    keyMarkets,
    industryContext,
    evidence: buildEvidence(records),
  }
}

export class MarketResearchAgent {
  private provider: MarketResearchProvider
  private marketDataTool: MarketDataTool
  private buildPrompt: MarketResearchPromptBuilder

  constructor(deps: MarketResearchAgentDeps) {
    this.provider = deps.provider
    this.marketDataTool = deps.marketDataTool
    this.buildPrompt = deps.buildPrompt ?? defaultBuildPrompt
  }

  async run(querySummary: QuerySummary): Promise<MarketContext> {
    const records = await this.marketDataTool.loadMarketData({
      topic: querySummary.topic,
      region: querySummary.region,
      searchHints: querySummary.searchHints,
    })

    if (records.length === 0) {
      return normalizeMarketContext({}, records, querySummary)
    }

    const messages = this.buildPrompt({
      querySummary,
      records,
    })

    const raw = await this.provider.generateJson<Partial<MarketContext>>({
      messages,
      temperature: 0,
      maxTokens: 700,
    })

    return normalizeMarketContext(raw, records, querySummary)
  }
}
