import { describe, expect, it, vi } from 'vitest'
import {
  QueryUnderstandingAgent,
  type QueryUnderstandingProvider
} from './query-understanding'

describe('QueryUnderstandingAgent', () => {
  it('should parse query and return normalized structured output', async () => {
    const provider: QueryUnderstandingProvider = {
      generateJson: vi.fn().mockResolvedValue({
        topic: 'Agricultural products',
        region: 'Southeast Asia',
        intent: 'market_exploration',
        informationNeeded: ['market insights', 'recent developments'],
        searchHints: [
          'agricultural products Southeast Asia market insights',
          'agricultural products Southeast Asia recent developments'
        ]
      })
    }

    const agent = new QueryUnderstandingAgent({ provider })

    const result = await agent.run(
      'Explore market insights and recent developments related to agricultural products in Southeast Asia.'
    )

    expect(result).toEqual({
      topic: 'Agricultural products',
      region: 'Southeast Asia',
      intent: 'market_exploration',
      informationNeeded: ['market insights', 'recent developments'],
      searchHints: [
        'agricultural products Southeast Asia market insights',
        'agricultural products Southeast Asia recent developments'
      ]
    })

    expect(provider.generateJson).toHaveBeenCalledTimes(1)
  })

  it('should build fallback values when provider returns partial data', async () => {
    const provider: QueryUnderstandingProvider = {
      generateJson: vi.fn().mockResolvedValue({
        topic: 'Agricultural products'
      })
    }

    const agent = new QueryUnderstandingAgent({ provider })

    const result = await agent.run(
      'Explore market insights and recent developments related to agricultural products in Southeast Asia.'
    )

    expect(result.topic).toBe('Agricultural products')
    expect(result.region).toBe('Global')
    expect(result.intent).toBe('market_exploration')
    expect(result.informationNeeded).toEqual([
      'market insights',
      'recent developments'
    ])
    expect(result.searchHints.length).toBeGreaterThan(0)
  })

  it('should throw if query is empty', async () => {
    const provider: QueryUnderstandingProvider = {
      generateJson: vi.fn()
    }

    const agent = new QueryUnderstandingAgent({ provider })

    await expect(agent.run('   ')).rejects.toThrow(
      'QueryUnderstandingAgent: query is required'
    )
  })

  it('should allow custom prompt builder', async () => {
    const provider: QueryUnderstandingProvider = {
      generateJson: vi.fn().mockResolvedValue({
        topic: 'Agricultural products',
        region: 'Southeast Asia',
        intent: 'market_exploration',
        informationNeeded: ['market insights'],
        searchHints: ['custom hint']
      })
    }

    const buildPrompt = vi.fn().mockReturnValue([
      { role: 'system', content: 'custom system prompt' },
      { role: 'user', content: 'custom user prompt' }
    ])

    const agent = new QueryUnderstandingAgent({
      provider,
      buildPrompt
    })

    await agent.run('test query')

    expect(buildPrompt).toHaveBeenCalledWith('test query')
    expect(provider.generateJson).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: 'system', content: 'custom system prompt' },
          { role: 'user', content: 'custom user prompt' }
        ]
      })
    )
  })
})
