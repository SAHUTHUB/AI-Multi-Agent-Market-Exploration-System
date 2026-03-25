import { NextResponse } from 'next/server'
import { QueryUnderstandingAgent } from '../../../lib/agents/query-understanding'
import { MarketResearchAgent } from '../../../lib/agents/market-research'
import { NewsSignalAgent } from '../../../lib/agents/news-signal'
import { MarketInsightOrchestrator } from '../../../lib/orchestrator/market-insight'
import { GroqProvider } from '../../../lib/providers/llm'
import { MockProvider } from '../../../lib/providers/mock'
import { JsonMarketDataTool } from '../../../lib/tools/market-data-tool'
import { JsonSignalDataTool } from '../../../lib/tools/signal-data-tool'

export const runtime = 'nodejs'

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function createProvider() {
  if (process.env.GROQ_API_KEY) {
    return new GroqProvider()
  }

  return new MockProvider()
}

function createOrchestrator() {
  const provider = createProvider()
  const marketDataTool = new JsonMarketDataTool()
  const signalDataTool = new JsonSignalDataTool()

  const queryUnderstandingAgent = new QueryUnderstandingAgent({
    provider,
  })

  const marketResearchAgent = new MarketResearchAgent({
    provider,
    marketDataTool,
  })

  const newsSignalAgent = new NewsSignalAgent({
    provider,
    signalDataTool,
  })

  return new MarketInsightOrchestrator({
    queryUnderstandingAgent,
    marketResearchAgent,
    newsSignalAgent,
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const query = body?.query

    if (!isNonEmptyString(query)) {
      return NextResponse.json(
        {
          error: 'Query is required',
        },
        { status: 400 }
      )
    }

    const orchestrator = createOrchestrator()
    const result = await orchestrator.run({
      query,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error'

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    )
  }
}
