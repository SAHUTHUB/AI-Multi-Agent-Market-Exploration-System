import { describe, expect, it, vi } from 'vitest'
import {
  NewsSignalAgent,
  type NewsSignalProvider,
  type SignalDataTool,
} from './news-signal'
import type { QuerySummary } from './query-understanding'
import type { MarketContext } from './market-research'

describe('NewsSignalAgent', () => {
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

  it('should analyze signals into normalized output', async () => {
    const signalDataTool: SignalDataTool = {
      loadSignals: vi.fn().mockResolvedValue([
        {
          country: 'Vietnam',
          topic: 'Agricultural products',
          region: 'Southeast Asia',
          headline: 'Agricultural export momentum remains strong',
          summary:
            'Recent reports suggest export activity is supported by resilient food demand.',
          impact: 'positive',
          source: 'mock-signal-data.json',
          publishedAt: '2026-03-10',
        },
        {
          country: 'Indonesia',
          topic: 'Agricultural products',
          region: 'Southeast Asia',
          headline: 'Import policy discussions may affect trade flows',
          summary:
            'New policy discussions may reshape agricultural import and export allocation.',
          impact: 'mixed',
          source: 'mock-signal-data.json',
          publishedAt: '2026-03-11',
        },
      ]),
    }

    const provider: NewsSignalProvider = {
      generateJson: vi.fn().mockResolvedValue({
        recentDevelopments: [
          {
            market: 'Vietnam',
            headline: 'Agricultural export momentum remains strong',
            summary:
              'Recent reports suggest export activity is supported by resilient food demand.',
            impact: 'positive',
            publishedAt: '2026-03-10',
          },
          {
            market: 'Indonesia',
            headline: 'Import policy discussions may affect trade flows',
            summary:
              'New policy discussions may reshape agricultural import and export allocation.',
            impact: 'mixed',
            publishedAt: '2026-03-11',
          },
        ],
        regionalSignals: [
          'Food demand remains supportive for regional exporters',
          'Policy shifts may change trade allocation across the region',
        ],
        overallInsight:
          'The region remains active, with supportive demand trends and policy-sensitive trade flows.',
      }),
    }

    const agent = new NewsSignalAgent({
      provider,
      signalDataTool,
    })

    const result = await agent.run(querySummary, marketContext)

    expect(result).toEqual({
      recentDevelopments: [
        {
          market: 'Vietnam',
          headline: 'Agricultural export momentum remains strong',
          summary:
            'Recent reports suggest export activity is supported by resilient food demand.',
          impact: 'positive',
          publishedAt: '2026-03-10',
        },
        {
          market: 'Indonesia',
          headline: 'Import policy discussions may affect trade flows',
          summary:
            'New policy discussions may reshape agricultural import and export allocation.',
          impact: 'mixed',
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
    })

    expect(signalDataTool.loadSignals).toHaveBeenCalledTimes(1)
    expect(provider.generateJson).toHaveBeenCalledTimes(1)
  })

  it('should fallback to source-derived values when provider returns partial data', async () => {
    const signalDataTool: SignalDataTool = {
      loadSignals: vi.fn().mockResolvedValue([
        {
          country: 'Thailand',
          topic: 'Agricultural products',
          region: 'Southeast Asia',
          headline: 'Investment in agricultural technology continues',
          summary:
            'Processing infrastructure and agri-tech investment may improve productivity.',
          impact: 'positive',
          source: 'mock-signal-data.json',
          publishedAt: '2026-03-09',
        },
      ]),
    }

    const provider: NewsSignalProvider = {
      generateJson: vi.fn().mockResolvedValue({
        overallInsight: 'Technology investment may support regional competitiveness.',
      }),
    }

    const agent = new NewsSignalAgent({
      provider,
      signalDataTool,
    })

    const result = await agent.run(querySummary, marketContext)

    expect(result.overallInsight).toBe(
      'Technology investment may support regional competitiveness.'
    )
    expect(result.recentDevelopments).toEqual([
      {
        market: 'Thailand',
        headline: 'Investment in agricultural technology continues',
        summary:
          'Processing infrastructure and agri-tech investment may improve productivity.',
        impact: 'positive',
        publishedAt: '2026-03-09',
      },
    ])
    expect(result.regionalSignals).toEqual([
      'Thailand: Investment in agricultural technology continues (positive)',
    ])
    expect(result.evidence).toEqual([
      {
        country: 'Thailand',
        source: 'mock-signal-data.json',
        headline: 'Investment in agricultural technology continues',
      },
    ])
  })

  it('should return safe fallback when no signals are found', async () => {
    const signalDataTool: SignalDataTool = {
      loadSignals: vi.fn().mockResolvedValue([]),
    }

    const provider: NewsSignalProvider = {
      generateJson: vi.fn(),
    }

    const agent = new NewsSignalAgent({
      provider,
      signalDataTool,
    })

    const result = await agent.run(querySummary, marketContext)

    expect(result).toEqual({
      recentDevelopments: [],
      regionalSignals: [],
      overallInsight:
        'No significant external signals were found for Agricultural products in Southeast Asia.',
      evidence: [],
    })

    expect(provider.generateJson).not.toHaveBeenCalled()
  })

  it('should allow custom prompt builder', async () => {
    const signalDataTool: SignalDataTool = {
      loadSignals: vi.fn().mockResolvedValue([
        {
          country: 'Vietnam',
          topic: 'Agricultural products',
          region: 'Southeast Asia',
          headline: 'Signal headline',
          summary: 'Signal summary',
          impact: 'mixed',
          source: 'mock-signal-data.json',
          publishedAt: '2026-03-10',
        },
      ]),
    }

    const provider: NewsSignalProvider = {
      generateJson: vi.fn().mockResolvedValue({
        recentDevelopments: [],
        regionalSignals: ['Custom signal'],
        overallInsight: 'Custom insight',
      }),
    }

    const buildPrompt = vi.fn().mockReturnValue([
      { role: 'system', content: 'custom system prompt' },
      { role: 'user', content: 'custom user prompt' },
    ])

    const agent = new NewsSignalAgent({
      provider,
      signalDataTool,
      buildPrompt,
    })

    await agent.run(querySummary, marketContext)

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
