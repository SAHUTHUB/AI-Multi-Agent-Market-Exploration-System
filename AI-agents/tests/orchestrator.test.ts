import { describe, expect, it, vi } from 'vitest'
import { MarketInsightOrchestrator } from '../orchestrator'
import type { QuerySummary } from '../agents/query-understanding'
import type { MarketContext } from '../agents/market-research'
import type { SignalAnalysis } from '../agents/news-signal'

describe('MarketInsightOrchestrator', () => {
  const querySummary: QuerySummary = {
    topic: 'Agricultural products',
    region: 'Southeast Asia',
    intent: 'market_exploration',
    informationNeeded: ['market insights', 'recent developments'],
    searchHints: [
      'agricultural products Southeast Asia market insights',
      'agricultural products Southeast Asia recent developments',
    ],
  }

  const marketContext: MarketContext = {
    overview:
      'Southeast Asia is an important agricultural production and export region.',
    keyMarkets: ['Thailand', 'Vietnam', 'Indonesia'],
    industryContext: [
      'Strong agricultural export activity',
      'Growing regional food supply chain capacity',
    ],
    evidence: [
      { country: 'Thailand', source: 'mock-market-data.json' },
      { country: 'Vietnam', source: 'mock-market-data.json' },
      { country: 'Indonesia', source: 'mock-market-data.json' },
    ],
  }

  const signalAnalysis: SignalAnalysis = {
    recentDevelopments: [
      {
        market: 'Vietnam',
        headline: 'Agricultural export momentum remains strong',
        summary:
          'Recent reports suggest export activity is supported by resilient food demand.',
        impact: 'positive',
        confidence: 'medium',
        publishedAt: '2026-03-10',
      },
      {
        market: 'Indonesia',
        headline: 'Import policy discussions may affect trade flows',
        summary:
          'New policy discussions may reshape agricultural import and export allocation.',
        impact: 'mixed',
        confidence: 'medium',
        publishedAt: '2026-03-11',
      },
    ],
    regionalSignals: [
      'Food demand remains supportive for regional exporters',
      'Policy shifts may change trade allocation across the region',
    ],
    overallInsight:
      'The region remains active, with supportive demand trends and policy-sensitive trade flows.',
    evidence: [
      {
        country: 'Vietnam',
        source: 'mock-signal-data.json',
        headline: 'Agricultural export momentum remains strong',
      },
      {
        country: 'Indonesia',
        source: 'mock-signal-data.json',
        headline: 'Import policy discussions may affect trade flows',
      },
    ],
  }

  it('should orchestrate all 3 agents and return final result', async () => {
    const queryUnderstandingAgent = {
      run: vi.fn().mockResolvedValue(querySummary),
    }

    const marketResearchAgent = {
      run: vi.fn().mockResolvedValue(marketContext),
    }

    const newsSignalAgent = {
      run: vi.fn().mockResolvedValue(signalAnalysis),
    }

    const orchestrator = new MarketInsightOrchestrator({
      queryUnderstandingAgent,
      marketResearchAgent,
      newsSignalAgent,
    })

    const result = await orchestrator.run({
      query:
        'Explore market insights and recent developments related to agricultural products in Southeast Asia.',
    })

    expect(result).toEqual({
      topic: 'Agricultural products',
      region: 'Southeast Asia',
      keyMarkets: ['Thailand', 'Vietnam', 'Indonesia'],
      marketInsights:
        'Southeast Asia is an important agricultural production and export region.',
      industryContext: [
        'Strong agricultural export activity',
        'Growing regional food supply chain capacity',
      ],
      recentDevelopments: [
        {
          market: 'Vietnam',
          headline: 'Agricultural export momentum remains strong',
          summary:
            'Recent reports suggest export activity is supported by resilient food demand.',
          impact: 'positive',
          confidence: 'medium',
          publishedAt: '2026-03-10',
        },
        {
          market: 'Indonesia',
          headline: 'Import policy discussions may affect trade flows',
          summary:
            'New policy discussions may reshape agricultural import and export allocation.',
          impact: 'mixed',
          confidence: 'medium',
          publishedAt: '2026-03-11',
        },
      ],
      regionalSignals: [
        'Food demand remains supportive for regional exporters',
        'Policy shifts may change trade allocation across the region',
      ],
      overallInsight:
        'The region remains active, with supportive demand trends and policy-sensitive trade flows.',
      evidence: [
        { country: 'Thailand', source: 'mock-market-data.json' },
        { country: 'Vietnam', source: 'mock-market-data.json' },
        { country: 'Indonesia', source: 'mock-market-data.json' },
        {
          country: 'Vietnam',
          source: 'mock-signal-data.json',
          headline: 'Agricultural export momentum remains strong',
        },
        {
          country: 'Indonesia',
          source: 'mock-signal-data.json',
          headline: 'Import policy discussions may affect trade flows',
        },
      ],
      executionTrace: [
        'workflow_started',
        'query_understanding_completed',
        'market_research_completed',
        'news_signal_analysis_completed',
        'query_breakdown: topic="Agricultural products", region="Southeast Asia", intent="market_exploration", info=["market insights", "recent developments"]',
        'market_context_result: key_markets=["Thailand", "Vietnam", "Indonesia"]',
        'news_analysis_result: found=2 developments, sources=mock',
        'workflow_completed',
      ],
    })

    expect(queryUnderstandingAgent.run).toHaveBeenCalledWith(
      'Explore market insights and recent developments related to agricultural products in Southeast Asia.'
    )
    expect(marketResearchAgent.run).toHaveBeenCalledWith(querySummary)
    expect(newsSignalAgent.run).toHaveBeenCalledWith(
      querySummary,
      marketContext,
      ['mock']
    )
  })

  it('should throw if query is empty', async () => {
    const orchestrator = new MarketInsightOrchestrator({
      queryUnderstandingAgent: {
        run: vi.fn(),
      },
      marketResearchAgent: {
        run: vi.fn(),
      },
      newsSignalAgent: {
        run: vi.fn(),
      },
    })

    await expect(
      orchestrator.run({
        query: '   ',
      })
    ).rejects.toThrow('MarketInsightOrchestrator: query is required')
  })

  it('should preserve execution order', async () => {
    const callOrder: string[] = []

    const orchestrator = new MarketInsightOrchestrator({
      queryUnderstandingAgent: {
        run: vi.fn().mockImplementation(async () => {
          callOrder.push('query')
          return querySummary
        }),
      },
      marketResearchAgent: {
        run: vi.fn().mockImplementation(async () => {
          callOrder.push('market')
          return marketContext
        }),
      },
      newsSignalAgent: {
        run: vi.fn().mockImplementation(async () => {
          callOrder.push('news')
          return signalAnalysis
        }),
      },
    })

    await orchestrator.run({
      query:
        'Explore market insights and recent developments related to agricultural products in Southeast Asia.',
    })

    expect(callOrder).toEqual(['query', 'market', 'news'])
  })

  it('should dedupe repeated evidence entries', async () => {
    const duplicatedMarketContext: MarketContext = {
      ...marketContext,
      evidence: [
        { country: 'Thailand', source: 'mock-market-data.json' },
        { country: 'Thailand', source: 'mock-market-data.json' },
      ],
    }

    const duplicatedSignalAnalysis: SignalAnalysis = {
      ...signalAnalysis,
      evidence: [
        {
          country: 'Vietnam',
          source: 'mock-signal-data.json',
          headline: 'Agricultural export momentum remains strong',
        },
        {
          country: 'Vietnam',
          source: 'mock-signal-data.json',
          headline: 'Agricultural export momentum remains strong',
        },
      ],
    }

    const orchestrator = new MarketInsightOrchestrator({
      queryUnderstandingAgent: {
        run: vi.fn().mockResolvedValue(querySummary),
      },
      marketResearchAgent: {
        run: vi.fn().mockResolvedValue(duplicatedMarketContext),
      },
      newsSignalAgent: {
        run: vi.fn().mockResolvedValue(duplicatedSignalAnalysis),
      },
    })

    const result = await orchestrator.run({
      query:
        'Explore market insights and recent developments related to agricultural products in Southeast Asia.',
    })

    expect(result.evidence).toEqual([
      { country: 'Thailand', source: 'mock-market-data.json' },
      {
        country: 'Vietnam',
        source: 'mock-signal-data.json',
        headline: 'Agricultural export momentum remains strong',
      },
    ])
  })
})
