import type { AiChatContextType } from '@/types/api'

export type AiChatSseErrorHandler = (errorMessage?: string) => void

export type AiChatSseStartHandlers = {
  onSession: (sessionId: number) => void
  onDelta: (delta: string) => void
  onDone?: () => void
  onError: AiChatSseErrorHandler
}

export type AiChatSseMessageHandlers = {
  onDelta: (delta: string) => void
  onDone?: () => void
  onError: AiChatSseErrorHandler
}

const getTokenOrThrow = () => {
  const token = localStorage.getItem('token')
  if (!token) throw new Error('missing token')
  return token
}

const safeParseNumber = (value: string) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export const aiChatSse = {
  openStartStream: (
    contextType: AiChatContextType,
    contextId: number,
    handlers: AiChatSseStartHandlers,
  ): EventSource => {
    const token = getTokenOrThrow()
    const url = `/api/ai/chat/start/stream?token=${encodeURIComponent(token)}&contextType=${encodeURIComponent(
      contextType,
    )}&contextId=${encodeURIComponent(String(contextId))}`

    const es = new EventSource(url)

    let finished = false
    const finishOnce = (fn: () => void) => {
      if (finished) return
      finished = true
      fn()
    }

    es.addEventListener('session', (event) => {
      const id = safeParseNumber(String((event as MessageEvent).data))
      if (id != null) handlers.onSession(id)
    })

    es.addEventListener('delta', (event) => {
      handlers.onDelta(String((event as MessageEvent).data || ''))
    })

    es.addEventListener('done', () => {
      finishOnce(() => handlers.onDone?.())
      es.close()
    })

    es.addEventListener('error', (event) => {
      const data = (event as MessageEvent).data
      finishOnce(() => handlers.onError(data ? String(data) : 'stream error'))
      es.close()
    })

    // Network-level errors
    es.onerror = () => {
      finishOnce(() => handlers.onError('stream connection error'))
      es.close()
    }

    return es
  },

  openMessageStream: (
    sessionId: number,
    userMessage: string,
    handlers: AiChatSseMessageHandlers,
  ): EventSource => {
    const token = getTokenOrThrow()
    const url = `/api/ai/chat/message/stream?token=${encodeURIComponent(token)}&sessionId=${encodeURIComponent(
      String(sessionId),
    )}&userMessage=${encodeURIComponent(userMessage)}`

    const es = new EventSource(url)

    let finished = false
    const finishOnce = (fn: () => void) => {
      if (finished) return
      finished = true
      fn()
    }

    es.addEventListener('delta', (event) => {
      handlers.onDelta(String((event as MessageEvent).data || ''))
    })

    es.addEventListener('done', () => {
      finishOnce(() => handlers.onDone?.())
      es.close()
    })

    es.addEventListener('error', (event) => {
      const data = (event as MessageEvent).data
      finishOnce(() => handlers.onError(data ? String(data) : 'stream error'))
      es.close()
    })

    es.onerror = () => {
      finishOnce(() => handlers.onError('stream connection error'))
      es.close()
    }

    return es
  },
}

