import type { AgentMessage } from '../../../AI-agents/agents/query-understanding'

export type LlmGenerateJsonArgs = {
  messages: AgentMessage[]
  temperature?: number
  maxTokens?: number
}

type GroqChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null
    }
    finish_reason?: string | null
  }>
  error?: {
    message?: string
  }
}

function getEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (!value) {
    throw new Error(`GroqProvider: missing environment variable ${name}`)
  }
  return value
}

function extractJsonText(content: string): string {
  const trimmed = content.trim()

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return trimmed
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim()
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1)
  }

  throw new Error('GroqProvider: response did not contain valid JSON text')
}

export class GroqProvider {
  private apiKey: string
  private model: string
  private baseUrl: string

  constructor(args?: {
    apiKey?: string
    model?: string
    baseUrl?: string
  }) {
    this.apiKey = args?.apiKey ?? getEnv('GROQ_API_KEY')
    this.model = args?.model ?? process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant'
    this.baseUrl =
      args?.baseUrl ?? process.env.GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1'
  }

  async generateJson<T>(args: LlmGenerateJsonArgs): Promise<T> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: args.messages,
        temperature: args.temperature ?? 0,
        max_completion_tokens: args.maxTokens ?? 800,
        response_format: {
          type: 'json_object',
        },
      }),
    })

    const payload = (await response.json()) as GroqChatCompletionResponse

    if (!response.ok) {
      throw new Error(
        `GroqProvider: request failed with status ${response.status}${
          payload?.error?.message ? ` - ${payload.error.message}` : ''
        }`
      )
    }

    const content = payload?.choices?.[0]?.message?.content

    if (!content || typeof content !== 'string') {
      throw new Error('GroqProvider: empty model response')
    }

    const jsonText = extractJsonText(content)

    try {
      return JSON.parse(jsonText) as T
    } catch (error) {
      throw new Error('GroqProvider: failed to parse JSON response')
    }
  }
}
