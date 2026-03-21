import request from '@/utils/request'
import type {
  AiChatContextType,
  AiChatHistoryItem,
  AiChatMessageRequest,
  AiChatMessageResponse,
  AiChatStartRequest,
  AiChatStartResponse,
} from '@/types/api'

export const aiChatApi = {
  start: (contextType: AiChatContextType, contextId: number): Promise<AiChatStartResponse> => {
    const body: AiChatStartRequest = { contextType, contextId }
    return request.post('/ai/chat/start', body)
  },

  message: (sessionId: number, userMessage: string): Promise<AiChatMessageResponse> => {
    const body: AiChatMessageRequest = { sessionId, userMessage }
    return request.post('/ai/chat/message', body)
  },

  history: (sessionId: number): Promise<AiChatHistoryItem[]> => {
    return request.get('/ai/chat/history', { params: { sessionId } })
  },
}

