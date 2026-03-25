import { describe, expect, it, vi } from 'vitest'
import {
  MarketResearchAgent,
  type MarketDataTool,
  type MarketResearchProvider,
} from './market-research'
import type { QuerySummary } from './query-understanding'

describe('MarketResearchAgent', () => {
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

  it('should summarize market data into normalized market context', async () => {
    const marketDataTool: MarketDataTool = {
      loadMarketData: vi.fn().mockResolvedValue([
        {
          country: 'Thailand',
          topic: 'Agricultural products',
          region: 'Southeast Asia',
          overviewPoints: ['Major regional agricultural exporter'],
          industrySignals: ['Strong processing infrastructure'],
          source: 'mock-market-data.json',
        },
        {
          country: 'Vietnam',
          topic: 'Agricultural products',
          region: 'Southeast Asia',
          overviewPoints: ['Strong export momentum in food-related sectors'],
          industrySignals: ['Growing demand from overseas markets'],
          source: 'mock-market-data.json',
        },
      ]),
    }

    const provider: MarketResearchProvider = {
      generateJson: vi.fn().mockResolvedValue({
        overview:
          'Southeast Asia is an important agricultural production and export region.',
        keyMarkets: ['Thailand', 'Vietnam'],
        industryContext: [
          'Strong agricultural export activity',
          'Growing regional food supply chain capacity',
        ],
      }),
    }

    const agent = new MarketResearchAgent({
      provider,
      marketDataTool,
    })

    const result = await agent.run(querySummary)

    expect(result).toEqual({
      overview:
        'Southeast Asia is an important agricultural production and export region.',
      keyMarkets: ['Thailand', 'Vietnam'],
      industryContext: [
        'Strong agricultural export activity',
        'Growing regional food supply chain capacity',
      ],
      evidence: [
        { country: 'Thailand', source: 'mock-market-data.json' },
        { country: 'Vietnam', source: 'mock-market-data.json' },
      ],
    })

    expect(marketDataTool.loadMarketData).toHaveBeenCalledTimes(1)
    expect(provider.generateJson).toHaveBeenCalledTimes(1)
  })

  it('should fallback to source-derived values when provider returns partial data', async () => {
    const marketDataTool: MarketDataTool = {
      loadMarketData: vi.fn().mockResolvedValue([
        {
          country: 'Thailand',
          topic: 'Agricultural products',
          region: 'Southeast Asia',
          overviewPoints: ['Major regional agricultural exporter'],
          industrySignals: ['Strong processing infrastructure'],
          source: 'mock-market-data.json',
        },
        {
          country: 'Indonesia',
          topic: 'Agricultural products',
          region: 'Southeast Asia',
          overviewPoints: ['Large domestic and regional trade relevance'],
          industrySignals: ['Growing agri-supply chain activity'],
          source: 'mock-market-data.json',
        },
      ]),
    }

    const provider: MarketResearchProvider = {
      generateJson: vi.fn().mockResolvedValue({
        overview: 'A relevant market region for agricultural products.',
      }),
    }

    const agent = new MarketResearchAgent({
      provider,
      marketDataTool,
    })

    const result = await agent.run(querySummary)

    expect(result.overview).toBe(
      'A relevant market region for agricultural products.'
    )
    expect(result.keyMarkets).toEqual(['Thailand', 'Indonesia'])
    expect(result.industryContext).toContain('Major regional agricultural exporter')
    expect(result.evidence).toEqual([
      { country: 'Thailand', source: 'mock-market-data.json' },
      { country: 'Indonesia', source: 'mock-market-data.json' },
    ])
  })

  it('should return safe fallback when no records are found', async () => {
    const marketDataTool: MarketDataTool = {
      loadMarketData: vi.fn().mockResolvedValue([]),
    }

    const provider: MarketResearchProvider = {
      generateJson: vi.fn(),
    }

    const agent = new MarketResearchAgent({
      provider,
      marketDataTool,
    })

    const result = await agent.run(querySummary)

    expect(result).toEqual({
      overview:
        'No structured market data was found for Agricultural products in Southeast Asia.',
      keyMarkets: [],
      industryContext: [],
      evidence: [],
    })

    expect(provider.generateJson).not.toHaveBeenCalled()
  })

  it('should allow custom prompt builder', async () => {
    const marketDataTool: MarketDataTool = {
      loadMarketData: vi.fn().mockResolvedValue([
        {
          country: 'Thailand',
          topic: 'Agricultural products',
          region: 'Southeast Asia',
          overviewPoints: ['Point A'],
          industrySignals: ['Signal A'],
          source: 'mock-market-data.json',
        },
      ]),
    }

    const provider: MarketResearchProvider = {
      generateJson: vi.fn().mockResolvedValue({
        overview: 'Custom overview',
        keyMarkets: ['Thailand'],
        industryContext: ['Custom context'],
      }),
    }

    const buildPrompt = vi.fn().mockReturnValue([
      { role: 'system', content: 'custom system prompt' },
      { role: 'user', content: 'custom user prompt' },
    ])

    const agent = new MarketResearchAgent({
      provider,
      marketDataTool,
      buildPrompt,
    })

    await agent.run(querySummary)

    expect(buildPrompt).toHaveBeenCalled()
    expect(provider.generateJson).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: 'system', content: 'custom system prompt' },
          { role: 'user', content: 'custom user prompt' },
        ],
      })
    )
  })
})
