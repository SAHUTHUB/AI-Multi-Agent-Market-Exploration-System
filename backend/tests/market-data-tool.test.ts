import { describe, expect, it } from 'vitest'
import { JsonMarketDataTool } from '../services/tools/market-data-tool'
import type { MarketDataRecord } from '../../AI-agents/agents/market-research'

describe('JsonMarketDataTool', () => {
  const records: MarketDataRecord[] = [
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
    {
      country: 'Germany',
      topic: 'Industrial machinery',
      region: 'Europe',
      overviewPoints: ['Strong manufacturing base'],
      industrySignals: ['Stable engineering demand'],
      source: 'mock-market-data.json',
    },
  ]

  it('should return strict topic + region matches first', async () => {
    const tool = new JsonMarketDataTool(records)

    const result = await tool.loadMarketData({
      topic: 'Agricultural products',
      region: 'Southeast Asia',
      searchHints: [],
    })

    expect(result).toHaveLength(2)
    expect(result.map((item) => item.country)).toEqual(['Thailand', 'Vietnam'])
  })

  it('should fallback to region matches if exact topic is missing', async () => {
    const tool = new JsonMarketDataTool(records)

    const result = await tool.loadMarketData({
      topic: 'Unknown topic',
      region: 'Southeast Asia',
      searchHints: [],
    })

    expect(result).toHaveLength(2)
    expect(result.map((item) => item.country)).toEqual(['Thailand', 'Vietnam'])
  })

  it('should fallback to search hint matching if region is missing', async () => {
    const tool = new JsonMarketDataTool(records)

    const result = await tool.loadMarketData({
      topic: 'Unknown topic',
      region: 'Unknown region',
      searchHints: ['Germany industrial machinery Europe'],
    })

    expect(result).toHaveLength(1)
    expect(result[0].country).toBe('Germany')
  })

  it('should dedupe repeated records', async () => {
    const tool = new JsonMarketDataTool([
      records[0],
      records[0],
      records[1],
    ])

    const result = await tool.loadMarketData({
      topic: 'Agricultural products',
      region: 'Southeast Asia',
      searchHints: [],
    })

    expect(result).toHaveLength(2)
  })
})
