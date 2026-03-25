export type AgentRole = 'system' | 'user' | 'assistant'

export type AgentMessage = {
  role: AgentRole
  content: string
}

export type QuerySummary = {
  topic: string
  region: string
  intent: string
  informationNeeded: string[]
  searchHints: string[]
}

export type QueryUnderstandingProvider = {
  generateJson<T>(args: {
    messages: AgentMessage[]
    temperature?: number
    maxTokens?: number
  }): Promise<T>
}

export type QueryUnderstandingPromptBuilder = (
  query: string
) => AgentMessage[]

export type QueryUnderstandingAgentDeps = {
  provider: QueryUnderstandingProvider
  buildPrompt?: QueryUnderstandingPromptBuilder
}

const DEFAULT_TOPIC = 'General market exploration'
const DEFAULT_REGION = 'Global'
const DEFAULT_INTENT = 'market_exploration'

function defaultBuildPrompt(query: string): AgentMessage[] {
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

function buildFallbackSearchHints(query: string, topic: string, region: string) {
  const safeQuery = query.trim()
  const hints = [
    `${topic} ${region} market insights`,
    `${topic} ${region} recent developments`,
    safeQuery
  ]
  return [...new Set(hints.map((item) => item.trim()).filter(Boolean))]
}

function normalizeQuerySummary(
  raw: Partial<QuerySummary> | null | undefined,
  query: string
): QuerySummary {
  const topic = cleanString(raw?.topic, DEFAULT_TOPIC)
  const region = cleanString(raw?.region, DEFAULT_REGION)
  const intent = cleanString(raw?.intent, DEFAULT_INTENT)

  const informationNeeded =
    cleanStringArray(raw?.informationNeeded).length > 0
      ? cleanStringArray(raw?.informationNeeded)
      : ['market insights', 'recent developments']

  const searchHints =
    cleanStringArray(raw?.searchHints).length > 0
      ? cleanStringArray(raw?.searchHints)
      : buildFallbackSearchHints(query, topic, region)

  return {
    topic,
    region,
    intent,
    informationNeeded,
    searchHints
  }
}

export class QueryUnderstandingAgent {
  private provider: QueryUnderstandingProvider
  private buildPrompt: QueryUnderstandingPromptBuilder

  constructor(deps: QueryUnderstandingAgentDeps) {
    this.provider = deps.provider
    this.buildPrompt = deps.buildPrompt ?? defaultBuildPrompt
  }

  async run(query: string): Promise<QuerySummary> {
    const normalizedQuery = query.trim()

    if (!normalizedQuery) {
      throw new Error('QueryUnderstandingAgent: query is required')
    }

    const messages = this.buildPrompt(normalizedQuery)

    const raw = await this.provider.generateJson<Partial<QuerySummary>>({
      messages,
      temperature: 0,
      maxTokens: 500
    })

    return normalizeQuerySummary(raw, normalizedQuery)
  }
}
