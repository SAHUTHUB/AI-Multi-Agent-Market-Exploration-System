import rawMarketData from '../data/mock-market-data.json'
import type { MarketDataRecord } from '../agents/market-research'

export type LoadMarketDataArgs = {
  topic: string
  region: string
  searchHints: string[]
}

export type MarketDataTool = {
  loadMarketData(args: LoadMarketDataArgs): Promise<MarketDataRecord[]>
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase()
}

function matchesTopic(record: MarketDataRecord, topic: string): boolean {
  return normalizeText(record.topic) === normalizeText(topic)
}

function matchesRegion(record: MarketDataRecord, region: string): boolean {
  return normalizeText(record.region) === normalizeText(region)
}

function matchesSearchHints(
  record: MarketDataRecord,
  searchHints: string[]
): boolean {
  if (searchHints.length === 0) return false

  const haystack = [
    record.country,
    record.topic,
    record.region,
    ...record.overviewPoints,
    ...record.industrySignals,
  ]
    .join(' ')
    .toLowerCase()

  return searchHints.some((hint) =>
    hint
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .every((token) => haystack.includes(token))
  )
}

function dedupeRecords(records: MarketDataRecord[]): MarketDataRecord[] {
  const seen = new Set<string>()

  return records.filter((record) => {
    const key = `${record.country}|${record.topic}|${record.region}|${record.source}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export class JsonMarketDataTool implements MarketDataTool {
  private records: MarketDataRecord[]

  constructor(records?: MarketDataRecord[]) {
    this.records = records ?? (rawMarketData as MarketDataRecord[])
  }

  async loadMarketData(args: LoadMarketDataArgs): Promise<MarketDataRecord[]> {
    const { topic, region, searchHints } = args

    const strictMatches = this.records.filter(
      (record) => matchesTopic(record, topic) && matchesRegion(record, region)
    )

    if (strictMatches.length > 0) {
      return dedupeRecords(strictMatches)
    }

    const regionMatches = this.records.filter((record) =>
      matchesRegion(record, region)
    )

    if (regionMatches.length > 0) {
      return dedupeRecords(regionMatches)
    }

    const hintMatches = this.records.filter((record) =>
      matchesSearchHints(record, searchHints)
    )

    return dedupeRecords(hintMatches)
  }
}
