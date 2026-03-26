import type {
  QuerySummary,
  QueryUnderstandingAgent,
} from './agents/query-understanding'
import type {
  MarketContext,
  MarketResearchAgent,
} from './agents/market-research'
import type {
  NewsSignalAgent,
  SignalAnalysis,
} from './agents/news-signal'

export type MarketInsightWorkflowInput = {
  query: string
  dataSource?: Array<'api' | 'scrape' | 'mock'>
}

export type MarketInsightWorkflowResult = {
  topic: string
  region: string
  keyMarkets: string[]
  marketInsights: string
  industryContext: string[]
  recentDevelopments: SignalAnalysis['recentDevelopments']
  regionalSignals: string[]
  overallInsight: string
  evidence: Array<
    | { country: string; source: string }
    | { country: string; source: string; headline: string }
  >
  executionTrace: string[]
}

export type MarketInsightOrchestratorDeps = {
  queryUnderstandingAgent: Pick<QueryUnderstandingAgent, 'run'>
  marketResearchAgent: Pick<MarketResearchAgent, 'run'>
  newsSignalAgent: Pick<NewsSignalAgent, 'run'>
}

function dedupeEvidence(
  evidence: MarketInsightWorkflowResult['evidence']
): MarketInsightWorkflowResult['evidence'] {
  const seen = new Set<string>()

  return evidence.filter((item) => {
    const key = 'headline' in item
      ? `${item.country}|${item.source}|${item.headline}`
      : `${item.country}|${item.source}`

    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function buildFinalResult(args: {
  querySummary: QuerySummary
  marketContext: MarketContext
  signalAnalysis: SignalAnalysis
  executionTrace: string[]
}): MarketInsightWorkflowResult {
  const { querySummary, marketContext, signalAnalysis, executionTrace } = args

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
      ...signalAnalysis.evidence,
    ]),
    executionTrace,
  }
}

export class MarketInsightOrchestrator {
  private queryUnderstandingAgent: Pick<QueryUnderstandingAgent, 'run'>
  private marketResearchAgent: Pick<MarketResearchAgent, 'run'>
  private newsSignalAgent: Pick<NewsSignalAgent, 'run'>

  constructor(deps: MarketInsightOrchestratorDeps) {
    this.queryUnderstandingAgent = deps.queryUnderstandingAgent
    this.marketResearchAgent = deps.marketResearchAgent
    this.newsSignalAgent = deps.newsSignalAgent
  }

  async run(
    input: MarketInsightWorkflowInput
  ): Promise<MarketInsightWorkflowResult> {
    const query = input.query?.trim()

    if (!query) {
      throw new Error('MarketInsightOrchestrator: query is required')
    }

    const executionTrace: string[] = ['workflow_started']

    const querySummary = await this.queryUnderstandingAgent.run(query)
    executionTrace.push('query_understanding_completed')

    const marketContext = await this.marketResearchAgent.run(querySummary)
    executionTrace.push('market_research_completed')

    const signalAnalysis = await this.newsSignalAgent.run(
      querySummary,
      marketContext,
      input.dataSource || ['mock']
    )
    executionTrace.push('news_signal_analysis_completed')

    const result = buildFinalResult({
      querySummary,
      marketContext,
      signalAnalysis,
      executionTrace,
    })

    result.executionTrace.push(
      `query_breakdown: topic="${querySummary.topic}", region="${querySummary.region}", intent="${querySummary.intent}", info=["${querySummary.informationNeeded.join('", "')}"]`
    )
    result.executionTrace.push(
      `market_context_result: key_markets=["${marketContext.keyMarkets.join('", "')}"]`
    )
    const uniqueSources = [...new Set(signalAnalysis.evidence.map(e => e.source))]
    result.executionTrace.push(
      `news_analysis_result: found=${signalAnalysis.recentDevelopments.length} developments, sources=${input.dataSource?.join(', ') || 'mock'}, references=["${uniqueSources.join('", "')}"]`
    )

    const missingKeys: string[] = []
    if (!process.env.GROQ_API_KEY) missingKeys.push('GROQ_API_KEY')
    if (input.dataSource?.includes('api') && !process.env.GNEWS_API_KEY) missingKeys.push('GNEWS_API_KEY')
    
    if (missingKeys.length > 0) {
      result.executionTrace.push(`warning: missing ${missingKeys.join(', ')}`)
    }

    result.executionTrace.push('workflow_completed')

    return result
  }
}
