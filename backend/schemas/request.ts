export type RequestBody = {
  query: string
}

type SafeParseSuccess<T> = {
  success: true
  data: T
}

type SafeParseError = {
  success: false
  error: {
    flatten: () => {
      fieldErrors: {
        query?: string[]
      }
    }
  }
}

const makeError = (message: string): SafeParseError => ({
  success: false,
  error: {
    flatten: () => ({
      fieldErrors: {
        query: [message],
      },
    }),
  },
})

export const RequestSchema = {
  safeParse(input: unknown): SafeParseSuccess<RequestBody> | SafeParseError {
    if (typeof input !== 'object' || input === null || !('query' in input)) {
      return makeError('Query is required')
    }

    const { query } = input as { query?: unknown }

    if (typeof query !== 'string' || query.trim().length === 0) {
      return makeError('Query is required')
    }

    return {
      success: true,
      data: {
        query,
      },
    }
  },
}
