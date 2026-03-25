import type {
  AgentMessage,
  QuerySummary,
} from './query-understanding'
import type { MarketContext } from './market-research'

export type ExternalSignalRecord = {
  country: string
  topic: string
  region: string
  headline: string
  summary: string
  impact: 'positive' | 'negative' | 'mixed' | 'neutral'
  source: string
  publishedAt: string
}

export type RecentDevelopment = {
  market: string
  headline: string
  summary: string
  impact: 'positive' | 'negative' | 'mixed' | 'neutral'
  publishedAt: string
}

export type SignalAnalysis = {
  recentDevelopments: RecentDevelopment[]
  regionalSignals: string[]
  overallInsight: string
  evidence: Array<{
    country: string
    source: string
    headline: string
  }>
}

export type NewsSignalProvider = {
  generateJson<T>(args: {
    messages: AgentMessage[]
    temperature?: number
    maxTokens?: number
  }): Promise<T>
}

export type SignalDataTool = {
  loadSignals(args: {
    topic: string
    region: string
    keyMarkets: string[]
    searchHints: string[]
  }): Promise<ExternalSignalRecord[]>
}

export type NewsSignalPromptBuilder = (args: {
  querySummary: QuerySummary
  marketContext: MarketContext
  records: ExternalSignalRecord[]
}) => AgentMessage[]

export type NewsSignalAgentDeps = {
  provider: NewsSignalProvider
  signalDataTool: SignalDataTool
  buildPrompt?: NewsSignalPromptBuilder
}

import { NEWS_SIGNAL_SYSTEM_PROMPT } from '../prompts/system-prompts'

function defaultBuildPrompt(args: {
  querySummary: QuerySummary
  marketContext: MarketContext
  records: ExternalSignalRecord[]
}): AgentMessage[] {
  const { querySummary, marketContext, records } = args

  return [
    {
      role: 'system',
      content: NEWS_SIGNAL_SYSTEM_PROMPT,
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

function cleanImpact(
  value: unknown
): 'positive' | 'negative' | 'mixed' | 'neutral' {
  if (
    value === 'positive' ||
    value === 'negative' ||
    value === 'mixed' ||
    value === 'neutral'
  ) {
    return value
  }

  return 'neutral'
}

function normalizeRecentDevelopments(
  raw: unknown,
  fallback: RecentDevelopment[]
): RecentDevelopment[] {
  if (!Array.isArray(raw)) return fallback

  const normalized = raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null

      const record = item as Partial<RecentDevelopment>

      return {
        market: cleanString(record.market, 'Unknown'),
        headline: cleanString(record.headline, 'Untitled development'),
        summary: cleanString(record.summary, ''),
        impact: cleanImpact(record.impact),
        publishedAt: cleanString(record.publishedAt, 'Unknown'),
      }
    })
    .filter((item): item is RecentDevelopment => item !== null)

  return normalized.length > 0 ? normalized : fallback
}

function cleanStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback
  const normalized = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)

  return normalized.length > 0 ? normalized : fallback
}

function buildFallbackRecentDevelopments(
  records: ExternalSignalRecord[]
): RecentDevelopment[] {
  return records.map((item) => ({
    market: item.country,
    headline: item.headline,
    summary: item.summary,
    impact: item.impact,
    publishedAt: item.publishedAt,
  }))
}

function buildFallbackRegionalSignals(
  records: ExternalSignalRecord[]
): string[] {
  const signals = records.map(
    (item) => `${item.country}: ${item.headline} (${item.impact})`
  )

  return [...new Set(signals)].slice(0, 6)
}

function buildFallbackOverallInsight(
  records: ExternalSignalRecord[],
  querySummary: QuerySummary,
  marketContext: MarketContext
): string {
  if (records.length === 0) {
    return `No significant external signals were found for ${querySummary.topic} in ${querySummary.region}.`
  }

  const countries = [...new Set(records.map((item) => item.country))]
  const marketsText =
    marketContext.keyMarkets.length > 0
      ? marketContext.keyMarkets.join(', ')
      : countries.join(', ')

  return `${querySummary.region} shows active external developments relevant to ${querySummary.topic}, especially across ${marketsText}.`
}

function buildEvidence(records: ExternalSignalRecord[]) {
  return records.map((item) => ({
    country: item.country,
    source: item.source,
    headline: item.headline,
  }))
}

function normalizeSignalAnalysis(
  raw: Partial<SignalAnalysis> | null | undefined,
  records: ExternalSignalRecord[],
  querySummary: QuerySummary,
  marketContext: MarketContext
): SignalAnalysis {
  const fallbackRecentDevelopments = buildFallbackRecentDevelopments(records)
  const fallbackRegionalSignals = buildFallbackRegionalSignals(records)
  const fallbackOverallInsight = buildFallbackOverallInsight(
    records,
    querySummary,
    marketContext
  )

  return {
    recentDevelopments: normalizeRecentDevelopments(
      raw?.recentDevelopments,
      fallbackRecentDevelopments
    ),
    regionalSignals: cleanStringArray(
      raw?.regionalSignals,
      fallbackRegionalSignals
    ),
    overallInsight: cleanString(raw?.overallInsight, fallbackOverallInsight),
    evidence: buildEvidence(records),
  }
}

export class NewsSignalAgent {
  private provider: NewsSignalProvider
  private signalDataTool: SignalDataTool
  private buildPrompt: NewsSignalPromptBuilder

  constructor(deps: NewsSignalAgentDeps) {
    this.provider = deps.provider
    this.signalDataTool = deps.signalDataTool
    this.buildPrompt = deps.buildPrompt ?? defaultBuildPrompt
  }

  async run(
    querySummary: QuerySummary,
    marketContext: MarketContext
  ): Promise<SignalAnalysis> {
    const records = await this.signalDataTool.loadSignals({
      topic: querySummary.topic,
      region: querySummary.region,
      keyMarkets: marketContext.keyMarkets,
      searchHints: querySummary.searchHints,
    })

    if (records.length === 0) {
      return normalizeSignalAnalysis({}, records, querySummary, marketContext)
    }

    const messages = this.buildPrompt({
      querySummary,
      marketContext,
      records,
    })

    const raw = await this.provider.generateJson<Partial<SignalAnalysis>>({
      messages,
      temperature: 0,
      maxTokens: 900,
    })

    return normalizeSignalAnalysis(raw, records, querySummary, marketContext)
  }
}
