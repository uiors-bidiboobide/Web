<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { aiChatApi } from '@/api/aiChat'
import { aiChatSse } from '@/api/aiChatSse'
import type { AiChatContextType, AiChatHistoryItem, AiChatRole } from '@/types/api'
import MarkdownText from '@/components/MarkdownText.vue'

type ChatMessage = {
  role: AiChatRole
  content: string
  createTime?: string
}

const route = useRoute()
const router = useRouter()

const contextType = ref<AiChatContextType | null>(null)
const contextId = ref<number | null>(null)

const sessionId = ref<number | null>(null)
const messages = ref<ChatMessage[]>([])
const inputText = ref('')
const sending = ref(false)
const initLoading = ref(false)
const errorText = ref('')
let activeEventSource: EventSource | null = null

const listRef = ref<HTMLElement | null>(null)

const stopStream = () => {
  if (activeEventSource) {
    activeEventSource.close()
    activeEventSource = null
  }
}

const storageKey = computed(() => {
  if (!contextType.value || contextId.value == null) return ''
  return `ai_chat:${contextType.value}:${contextId.value}`
})

const dialogTitle = computed(() => {
  if (!contextType.value) return 'AI 对话'
  return contextType.value === 'KNOWLEDGE_POINT' ? '知识点 AI 讲解' : '题目 AI 讲解'
})

const scrollToBottom = async () => {
  await nextTick()
  const el = listRef.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

const parseQuery = () => {
  const ctRaw = route.query.contextType
  const cidRaw = route.query.contextId

  const ct = Array.isArray(ctRaw) ? ctRaw[0] : ctRaw
  const cidStr = Array.isArray(cidRaw) ? cidRaw[0] : cidRaw

  if (ct !== 'KNOWLEDGE_POINT' && ct !== 'QUESTION') {
    contextType.value = null
    contextId.value = null
    errorText.value = 'contextType 参数无效'
    return
  }

  const cid = Number(cidStr)
  if (!Number.isFinite(cid) || cid <= 0) {
    contextType.value = null
    contextId.value = null
    errorText.value = 'contextId 参数无效'
    return
  }

  contextType.value = ct
  contextId.value = cid
  errorText.value = ''
}

const loadFromLocalOrStart = async () => {
  if (!contextType.value || contextId.value == null) return
  if (!storageKey.value) return

  initLoading.value = true
  stopStream()
  try {
    messages.value = []
    sessionId.value = null
    inputText.value = ''

    const saved = localStorage.getItem(storageKey.value)
    if (saved) {
      const id = Number(saved)
      if (Number.isFinite(id) && id > 0) {
        try {
          const history = await aiChatApi.history(id)
          sessionId.value = id
          messages.value = history.map((item: AiChatHistoryItem) => ({
            role: item.role,
            content: item.content,
            createTime: item.createTime,
          }))
          await scrollToBottom()
          return
        } catch {
          // 如果历史拉取失败，降级为重新 start
        }
      }
    }

    messages.value = [{ role: 'ASSISTANT', content: '' }]
    const assistantIndex = 0
    let settled = false
    const settle = () => {
      if (settled) return
      settled = true
      initLoading.value = false
    }

    const done = new Promise<void>((resolve) => {
      try {
        activeEventSource = aiChatSse.openStartStream(contextType.value!, contextId.value!, {
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
            resolve()
          },
          onError: async (errorMessage) => {
            stopStream()
            try {
              const res = await aiChatApi.start(contextType.value!, contextId.value!)
              sessionId.value = res.sessionId
              localStorage.setItem(storageKey.value, String(res.sessionId))
              messages.value[assistantIndex].content = res.assistantMessage
            } catch {
              ElMessage.error(errorMessage || '创建/加载对话失败，请稍后重试')
            } finally {
              settle()
              resolve()
            }
          },
        })
      } catch {
        // SSE 无法启动，回退同步 start
        ;(async () => {
          try {
            const res = await aiChatApi.start(contextType.value!, contextId.value!)
            sessionId.value = res.sessionId
            localStorage.setItem(storageKey.value, String(res.sessionId))
            messages.value = [{ role: 'ASSISTANT', content: res.assistantMessage }]
            await scrollToBottom()
          } catch {
            ElMessage.error('创建/加载对话失败，请稍后重试')
          } finally {
            settle()
            resolve()
          }
        })()
      }
    })

    await scrollToBottom()
    await done
  } catch {
    ElMessage.error('创建/加载对话失败，请稍后重试')
  } finally {
    // 若上面 SSE 成功/失败已经处理 settle，这里不覆盖
    initLoading.value = false
  }
}

const send = async () => {
  const text = inputText.value.trim()
  if (!text) return
  if (!sessionId.value) return
  if (sending.value) return

  sending.value = true
  stopStream()
  try {
    messages.value.push({ role: 'USER', content: text, createTime: new Date().toISOString() })
    inputText.value = ''
    await scrollToBottom()

    const assistantIndex = messages.value.length
    messages.value.push({ role: 'ASSISTANT', content: '' })
    await scrollToBottom()

    const currentSessionId = sessionId.value!
    let settled = false
    const settle = () => {
      if (settled) return
      settled = true
      sending.value = false
    }

    const done = new Promise<void>((resolve) => {
      try {
        activeEventSource = aiChatSse.openMessageStream(currentSessionId, text, {
          onDelta: (delta) => {
            messages.value[assistantIndex].content += delta
          },
          onDone: () => {
            stopStream()
            settle()
            resolve()
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
              resolve()
            }
          },
        })
      } catch {
        ;(async () => {
          try {
            const res = await aiChatApi.message(currentSessionId, text)
            messages.value[assistantIndex].content = res.assistantMessage
            await scrollToBottom()
          } catch {
            ElMessage.error('发送失败，请稍后重试')
          } finally {
            settle()
            resolve()
          }
        })()
      }
    })

    await done
  } catch {
    ElMessage.error('发送失败，请稍后重试')
  } finally {
    sending.value = false
  }
}

watch(
  () => [route.query.contextType, route.query.contextId],
  async () => {
    parseQuery()
    if (!contextType.value || contextId.value == null) return
    await loadFromLocalOrStart()
  },
)

onMounted(async () => {
  parseQuery()
  if (!contextType.value || contextId.value == null) return
  await loadFromLocalOrStart()
})

onUnmounted(() => {
  stopStream()
})
</script>

<template>
  <el-card class="page-card">
    <template #header>
      <div class="header-row">
        <div class="header-left">
          <el-button text @click="router.back()">返回</el-button>
          <span class="header-title">{{ dialogTitle }}</span>
        </div>
      </div>
    </template>

    <div v-if="errorText" class="error-wrap">
      <el-alert type="error" :closable="false" :title="errorText" />
    </div>

    <div v-else class="chat-wrap">
      <div class="chat-list" ref="listRef">
        <div v-if="initLoading" class="chat-loading">正在加载对话…</div>
        <div v-else>
          <div v-for="(m, idx) in messages" :key="idx" class="chat-message">
            <div class="chat-meta">{{ m.role === 'USER' ? '你' : '助手' }}</div>
            <div class="chat-content">
              <template v-if="m.role === 'ASSISTANT'">
                <MarkdownText :content="m.content" />
              </template>
              <template v-else>
                {{ m.content }}
              </template>
            </div>
          </div>
          <div v-if="messages.length === 0" class="empty-tip">暂无消息</div>
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
        <el-button type="primary" :loading="sending" :disabled="!inputText.trim() || initLoading" @click="send">
          发送
        </el-button>
      </div>
    </div>
  </el-card>
</template>

<style scoped>
.page-card {
  min-height: calc(100vh - 120px);
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-title {
  font-size: 16px;
  font-weight: 700;
}

.error-wrap {
  margin-bottom: 12px;
}

.chat-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-list {
  height: 520px;
  overflow: auto;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f8fafc;
}

.chat-loading {
  padding: 24px 16px;
  color: #6b7280;
}

.chat-message {
  margin: 12px 0;
}

.chat-meta {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.chat-content {
  white-space: normal;
  line-height: 1.6;
  padding: 10px 12px;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

:deep(.markdown-body p) {
  margin: 0 0 8px 0;
}

:deep(.markdown-body code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.empty-tip {
  padding: 24px 16px;
  color: #6b7280;
  text-align: center;
}

.chat-input {
  display: grid;
  grid-template-columns: 1fr 120px;
  gap: 12px;
  align-items: end;
}
</style>

