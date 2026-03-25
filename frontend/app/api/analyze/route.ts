import { NextResponse } from 'next/server'
import { RequestSchema } from '../../../../backend/schemas/request'
import { QueryUnderstandingAgent } from '../../../../AI-agents/agents/query-understanding'
import { MarketResearchAgent } from '../../../../AI-agents/agents/market-research'
import { NewsSignalAgent } from '../../../../AI-agents/agents/news-signal'
import { MarketInsightOrchestrator } from '../../../../AI-agents/orchestrator'
import { GroqProvider } from '../../../../backend/services/providers/llm'
import { MockProvider } from '../../../../backend/services/providers/mock'
import { JsonMarketDataTool } from '../../../../backend/services/tools/market-data-tool'
import { JsonSignalDataTool } from '../../../../backend/services/tools/signal-data-tool'

export const runtime = 'nodejs'

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
    const parsed = RequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'Validation error',
        },
        { status: 400 }
      )
    }

    const { query, dataSource } = parsed.data

    const orchestrator = createOrchestrator()
    const result = await orchestrator.run({
      query,
      dataSource
    } as any)

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
