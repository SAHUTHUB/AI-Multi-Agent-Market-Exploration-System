import type { AgentMessage } from '../agents/query-understanding'

export class MockProvider {
  async generateJson<T>(args: {
    messages: AgentMessage[]
    temperature?: number
    maxTokens?: number
  }): Promise<T> {
    const promptText = args.messages.map(m => m.content).join(' ')
    
    // QueryUnderstandingAgent
    if (promptText.includes('Parse this user query into structured JSON')) {
      return {
        topic: 'Agricultural products',
        region: 'Southeast Asia',
        intent: 'market_exploration',
        informationNeeded: ['market insights', 'recent developments'],
        searchHints: [
          'Agricultural products Southeast Asia market insights',
          'Agricultural products Southeast Asia recent developments',
        ],
      } as unknown as T
    }

    // MarketResearchAgent
    if (promptText.includes('Build a market context summary')) {
      return {
        overview: 'Southeast Asia is an important agricultural production and export region.',
        keyMarkets: ['Thailand', 'Vietnam', 'Indonesia'],
        industryContext: [
          'Strong agricultural export activity',
          'Growing regional food supply chain capacity',
          'Regional trade continues to support market relevance'
        ],
      } as unknown as T
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
      } as unknown as T
    }

    return {} as unknown as T
  }
}
