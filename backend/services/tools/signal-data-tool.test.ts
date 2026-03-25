import { describe, expect, it } from 'vitest'
import { JsonSignalDataTool } from './signal-data-tool'
import type { ExternalSignalRecord } from '../agents/news-signal'

describe('JsonSignalDataTool', () => {
  const records: ExternalSignalRecord[] = [
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
    {
      country: 'Germany',
      topic: 'Industrial machinery',
      region: 'Europe',
      headline: 'Industrial orders remain stable',
      summary: 'European industrial machinery demand remains steady.',
      impact: 'neutral',
      source: 'mock-signal-data.json',
      publishedAt: '2026-03-08',
    },
  ]

  it('should return strict topic + region + key market matches first', async () => {
    const tool = new JsonSignalDataTool(records)

    const result = await tool.loadSignals({
      topic: 'Agricultural products',
      region: 'Southeast Asia',
      keyMarkets: ['Vietnam', 'Indonesia'],
      searchHints: [],
    })

    expect(result).toHaveLength(2)
    expect(result.map((item) => item.country)).toEqual([
      'Indonesia',
      'Vietnam',
    ])
  })

  it('should fallback to region + key market matches if exact topic is missing', async () => {
    const tool = new JsonSignalDataTool(records)

    const result = await tool.loadSignals({
      topic: 'Unknown topic',
      region: 'Southeast Asia',
      keyMarkets: ['Thailand', 'Vietnam'],
      searchHints: [],
    })

    expect(result).toHaveLength(2)
    expect(result.map((item) => item.country)).toEqual([
      'Vietnam',
      'Thailand',
    ])
  })

  it('should fallback to search hint matching if region is missing', async () => {
    const tool = new JsonSignalDataTool(records)

    const result = await tool.loadSignals({
      topic: 'Unknown topic',
      region: 'Unknown region',
      keyMarkets: [],
      searchHints: ['Germany industrial machinery Europe stable'],
    })

    expect(result).toHaveLength(1)
    expect(result[0].country).toBe('Germany')
  })

  it('should dedupe repeated records and sort newest first', async () => {
    const tool = new JsonSignalDataTool([
      records[1],
      records[1],
      records[2],
    ])

    const result = await tool.loadSignals({
      topic: 'Agricultural products',
      region: 'Southeast Asia',
      keyMarkets: ['Vietnam', 'Indonesia'],
      searchHints: [],
    })

    expect(result).toHaveLength(2)
    expect(result[0].publishedAt).toBe('2026-03-11')
    expect(result[1].publishedAt).toBe('2026-03-10')
  })
})
