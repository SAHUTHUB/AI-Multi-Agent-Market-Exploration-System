import { afterEach, describe, expect, it } from 'vitest'
import { POST } from './route'

describe('POST /api/analyze', () => {
  const originalEnv = process.env

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('should return 400 when query is missing', async () => {
    process.env = {
      ...originalEnv,
    }
    delete process.env.GROQ_API_KEY

    const request = new Request('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    // Accept either the custom message or the zod default for flexibility
    const errorMessage = json.error
    expect(['Query is required', 'Invalid input: expected string, received undefined']).toContain(errorMessage)
  })

  it('should return final workflow result using MockProvider when GROQ_API_KEY is absent', async () => {
    process.env = {
      ...originalEnv,
    }
    delete process.env.GROQ_API_KEY

    const request = new Request('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query:
          'Explore market insights and recent developments related to agricultural products in Southeast Asia.',
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)

    expect(json.topic).toBe('Agricultural products')
    expect(json.region).toBe('Southeast Asia')
    expect(json.keyMarkets).toEqual(['Thailand', 'Vietnam', 'Indonesia'])
    expect(json.marketInsights).toBe(
      'Southeast Asia is an important agricultural production and export region.'
    )
    expect(json.industryContext).toEqual([
      'Strong agricultural export activity',
      'Growing regional food supply chain capacity',
      'Regional trade continues to support market relevance',
    ])

    expect(json.recentDevelopments).toHaveLength(2)
    expect(json.regionalSignals).toEqual([
      'Food demand remains supportive for regional exporters',
      'Policy shifts may change trade allocation across the region',
    ])
    expect(json.overallInsight).toBe(
      'The region remains active, with supportive demand trends and policy-sensitive trade flows.'
    )

    expect(json.evidence).toHaveLength(6)
    expect(json.executionTrace).toEqual([
      'workflow_started',
      'query_understanding_completed',
      'market_research_completed',
      'news_signal_analysis_completed',
      'workflow_completed',
    ])
  })
})
