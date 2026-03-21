<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { aiChatApi } from '@/api/aiChat'
import { aiChatSse } from '@/api/aiChatSse'
import type { AiChatContextType, AiChatHistoryItem, AiChatRole } from '@/types/api'
import MarkdownText from '@/components/MarkdownText.vue'

const props = defineProps<{
  visible: boolean
  contextType: AiChatContextType
  contextId: number
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

type ChatMessage = {
  role: AiChatRole
  content: string
  createTime?: string
}

const sessionId = ref<number | null>(null)
const messages = ref<ChatMessage[]>([])
const inputText = ref('')
const sending = ref(false)
const historyLoading = ref(false)
let activeEventSource: EventSource | null = null

const storageKey = computed(() => `ai_chat:${props.contextType}:${props.contextId}`)
const dialogTitle = computed(() => {
  return props.contextType === 'KNOWLEDGE_POINT' ? '知识点 AI 提问' : '题目 AI 讲解'
})

const listRef = ref<HTMLElement | null>(null)

const stopStream = () => {
  if (activeEventSource) {
    activeEventSource.close()
    activeEventSource = null
  }
}

const scrollToBottom = async () => {
  await nextTick()
  const el = listRef.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

const loadFromHistory = async () => {
  const saved = localStorage.getItem(storageKey.value)
  if (!saved) return false

  const id = Number(saved)
  if (!Number.isFinite(id) || id <= 0) return false

  historyLoading.value = true
  try {
    const history = await aiChatApi.history(id)
    sessionId.value = id

    messages.value = history.map((item: AiChatHistoryItem) => ({
      role: item.role,
      content: item.content,
      createTime: item.createTime,
    }))
    await scrollToBottom()
    return true
  } catch {
    return false
  } finally {
    historyLoading.value = false
  }
}

const startNewChat = async () => {
  historyLoading.value = true
  stopStream()

  try {
    messages.value = [{ role: 'ASSISTANT', content: '' }]
    sessionId.value = null
    await scrollToBottom()

    const assistantIndex = 0
    let settled = false
    const settle = () => {
      if (settled) return
      settled = true
      historyLoading.value = false
    }

    activeEventSource = aiChatSse.openStartStream(props.contextType, props.contextId, {
      onSession: (id) => {
        sessionId.value = id
        localStorage.setItem(storageKey.value, String(id))
      },
      onDelta: (delta) => {
        messages.value[assistantIndex].content += delta
      },
      onDone: () => {
        stopStream()
        settle()
      },
      onError: async (errorMessage) => {
        stopStream()
        try {
          const res = await aiChatApi.start(props.contextType, props.contextId)
          sessionId.value = res.sessionId
          localStorage.setItem(storageKey.value, String(res.sessionId))
          messages.value[assistantIndex].content = res.assistantMessage
        } catch {
          ElMessage.error(errorMessage || '创建对话失败，请稍后重试')
        } finally {
          settle()
        }
      },
    })
  } catch {
    // SSE 无法启动（例如缺 token），回退同步接口
    try {
      const res = await aiChatApi.start(props.contextType, props.contextId)
      sessionId.value = res.sessionId
      localStorage.setItem(storageKey.value, String(res.sessionId))
      messages.value = [{ role: 'ASSISTANT', content: res.assistantMessage }]
      await scrollToBottom()
    } catch {
      ElMessage.error('创建对话失败，请稍后重试')
    } finally {
      historyLoading.value = false
    }
  }
}

const init = async () => {
  // 只有 visible=true 时才初始化
  if (!props.visible) return

  // 重置 UI 状态
  stopStream()
  inputText.value = ''
  sending.value = false
  messages.value = []
  sessionId.value = null
  historyLoading.value = false

  // 优先拉历史；没有历史则创建新会话
  const ok = await loadFromHistory()
  if (!ok) {
    await startNewChat()
  }
}

watch(
  () => props.visible,
  async (v) => {
    if (v) {
      await init()
    }
  },
)

watch(
  storageKey,
  async () => {
    if (props.visible) {
      await init()
    }
  },
)

const close = () => {
  stopStream()
  emit('update:visible', false)
}

const send = async () => {
  const text = inputText.value.trim()
  if (!text) return
  if (!sessionId.value) return
  if (sending.value) return

  sending.value = true
  try {
    // 先把用户消息展示出来（模型返回后追加 assistant）
    messages.value.push({ role: 'USER', content: text, createTime: new Date().toISOString() })
    inputText.value = ''
    await scrollToBottom()

    stopStream()

    const assistantIndex = messages.value.length
    messages.value.push({ role: 'ASSISTANT', content: '' })
    await scrollToBottom()

    const currentSessionId = sessionId.value
    let settled = false
    const settle = () => {
      if (settled) return
      settled = true
      sending.value = false
    }

    activeEventSource = aiChatSse.openMessageStream(currentSessionId, text, {
      onDelta: (delta) => {
        messages.value[assistantIndex].content += delta
      },
      onDone: () => {
        stopStream()
        settle()
      },
      onError: async (errorMessage) => {
        stopStream()
        try {
          const res = await aiChatApi.message(currentSessionId, text)
          messages.value[assistantIndex].content = res.assistantMessage
        } catch {
          ElMessage.error(errorMessage || '发送失败，请稍后重试')
        } finally {
          settle()
        }
      },
    })
  } catch {
    // SSE 无法启动（例如缺 token），回退同步接口
    try {
      const res = await aiChatApi.message(sessionId.value, text)
      messages.value.push({ role: 'ASSISTANT', content: res.assistantMessage })
      await scrollToBottom()
    } catch {
      ElMessage.error('发送失败，请稍后重试')
    } finally {
      sending.value = false
    }
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="dialogTitle"
    width="680px"
    @close="close"
  >
    <div class="chat-body">
      <div ref="listRef" class="chat-list" :class="{ loading: historyLoading }">
        <div v-if="historyLoading" class="chat-loading">正在加载历史/首条讲解…</div>

        <div v-else>
          <div
            v-for="(m, idx) in messages"
            :key="idx"
            class="chat-message"
            :class="m.role === 'USER' ? 'chat-message-user' : 'chat-message-assistant'"
          >
            <div class="chat-role">
              {{ m.role === 'USER' ? '你' : '助手' }}
            </div>
            <div class="chat-content">
              <template v-if="m.role === 'ASSISTANT'">
                <MarkdownText :content="m.content" />
              </template>
              <template v-else>
                {{ m.content }}
              </template>
            </div>
          </div>
        </div>
      </div>

      <div class="chat-input">
        <el-input
          v-model="inputText"
          type="textarea"
          :rows="3"
          placeholder="输入你的追问…"
          @keydown.enter.exact.prevent="send"
        />
        <el-button class="send-btn" type="primary" :loading="sending" :disabled="!inputText.trim()" @click="send">
          发送
        </el-button>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.chat-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-list {
  height: 420px;
  overflow: auto;
  padding: 8px 6px;
  background: #f8fafc;
  border-radius: 8px;
}

.chat-loading {
  padding: 24px 16px;
  color: #6b7280;
}

.chat-message {
  display: grid;
  gap: 4px;
  margin: 10px 0;
}

.chat-message-user {
  align-items: end;
  text-align: right;
}

.chat-message-assistant {
  text-align: left;
}

.chat-role {
  font-size: 12px;
  color: #6b7280;
}

.chat-content {
  white-space: normal;
  line-height: 1.5;
  padding: 10px 12px;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

:deep(.markdown-body p) {
  margin: 0 0 8px 0;
}

.chat-message-user .chat-content {
  background: #e0f2fe;
}

.chat-input {
  display: grid;
  grid-template-columns: 1fr 110px;
  gap: 12px;
  align-items: end;
}

.send-btn {
  height: 42px;
}
</style>

