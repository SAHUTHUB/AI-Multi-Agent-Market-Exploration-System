import rawSignalData from '../data/mock-signal-data.json'
import type { ExternalSignalRecord } from '../agents/news-signal'

export type LoadSignalsArgs = {
  topic: string
  region: string
  keyMarkets: string[]
  searchHints: string[]
}

export type SignalDataTool = {
  loadSignals(args: LoadSignalsArgs): Promise<ExternalSignalRecord[]>
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase()
}

function matchesTopic(record: ExternalSignalRecord, topic: string): boolean {
  return normalizeText(record.topic) === normalizeText(topic)
}

function matchesRegion(record: ExternalSignalRecord, region: string): boolean {
  return normalizeText(record.region) === normalizeText(region)
}

function matchesKeyMarkets(
  record: ExternalSignalRecord,
  keyMarkets: string[]
): boolean {
  if (keyMarkets.length === 0) return false
  return keyMarkets.some(
    (market) => normalizeText(market) === normalizeText(record.country)
  )
}

function matchesSearchHints(
  record: ExternalSignalRecord,
  searchHints: string[]
): boolean {
  if (searchHints.length === 0) return false

  const haystack = [
    record.country,
    record.topic,
    record.region,
    record.headline,
    record.summary,
    record.impact,
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

function dedupeRecords(records: ExternalSignalRecord[]): ExternalSignalRecord[] {
  const seen = new Set<string>()

  return records.filter((record) => {
    const key = [
      record.country,
      record.topic,
      record.region,
      record.headline,
      record.source,
      record.publishedAt,
    ].join('|')

    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function sortNewestFirst(
  records: ExternalSignalRecord[]
): ExternalSignalRecord[] {
  return [...records].sort((a, b) => {
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  })
}

export class JsonSignalDataTool implements SignalDataTool {
  private records: ExternalSignalRecord[]

  constructor(records?: ExternalSignalRecord[]) {
    this.records = records ?? (rawSignalData as ExternalSignalRecord[])
  }

  async loadSignals(args: LoadSignalsArgs): Promise<ExternalSignalRecord[]> {
    const { topic, region, keyMarkets, searchHints } = args

    const strictMatches = this.records.filter(
      (record) =>
        matchesTopic(record, topic) &&
        matchesRegion(record, region) &&
        (keyMarkets.length === 0 || matchesKeyMarkets(record, keyMarkets))
    )

    if (strictMatches.length > 0) {
      return sortNewestFirst(dedupeRecords(strictMatches))
    }

    const regionMatches = this.records.filter(
      (record) =>
        matchesRegion(record, region) &&
        (keyMarkets.length === 0 || matchesKeyMarkets(record, keyMarkets))
    )

    if (regionMatches.length > 0) {
      return sortNewestFirst(dedupeRecords(regionMatches))
    }

    const hintMatches = this.records.filter((record) =>
      matchesSearchHints(record, searchHints)
    )

    return sortNewestFirst(dedupeRecords(hintMatches))
  }
}
