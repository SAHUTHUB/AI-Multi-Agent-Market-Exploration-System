import { afterEach, describe, expect, it, vi } from 'vitest'
import { GroqProvider } from './llm'

describe('GroqProvider', () => {
  const originalEnv = process.env

  afterEach(() => {
    vi.restoreAllMocks()
    process.env = { ...originalEnv }
  })

  it('should call Groq chat completions and parse json_object response', async () => {
    process.env = {
      ...originalEnv,
      GROQ_API_KEY: 'test-key',
      GROQ_MODEL: 'llama-3.1-8b-instant',
    }

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                topic: 'Agricultural products',
                region: 'Southeast Asia',
                intent: 'market_exploration',
                informationNeeded: ['market insights', 'recent developments'],
                searchHints: [
                  'Agricultural products Southeast Asia market insights',
                  'Agricultural products Southeast Asia recent developments',
                ],
              }),
            },
          },
        ],
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    const provider = new GroqProvider()

    const result = await provider.generateJson<{
      topic: string
      region: string
      intent: string
      informationNeeded: string[]
      searchHints: string[]
    }>({
      messages: [
        { role: 'system', content: 'Return JSON only' },
        { role: 'user', content: 'Parse this query' },
      ],
      temperature: 0,
      maxTokens: 300,
    })

    expect(result.topic).toBe('Agricultural products')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      })
    )
  })

  it('should parse fenced json if model wraps output in markdown', async () => {
    process.env = {
      ...originalEnv,
      GROQ_API_KEY: 'test-key',
    }

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '```json\n{"hello":"world"}\n```',
            },
          },
        ],
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    const provider = new GroqProvider()

    const result = await provider.generateJson<{ hello: string }>({
      messages: [{ role: 'user', content: 'Return JSON' }],
    })

    expect(result).toEqual({ hello: 'world' })
  })

  it('should throw helpful error on Groq API failure', async () => {
    process.env = {
      ...originalEnv,
      GROQ_API_KEY: 'test-key',
    }

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: {
          message: 'Invalid API key',
        },
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    const provider = new GroqProvider()

    await expect(
      provider.generateJson({
        messages: [{ role: 'user', content: 'Return JSON' }],
      })
    ).rejects.toThrow(
      'GroqProvider: request failed with status 401 - Invalid API key'
    )
  })

  it('should throw if GROQ_API_KEY is missing', () => {
    process.env = {
      ...originalEnv,
    }
    delete process.env.GROQ_API_KEY

    expect(() => new GroqProvider()).toThrow(
      'GroqProvider: missing environment variable GROQ_API_KEY'
    )
  })
})
