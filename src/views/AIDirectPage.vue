<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { aiChatApi } from '@/api/aiChat'
import { aiChatSse } from '@/api/aiChatSse'
import type { AiChatContextType, AiChatRole } from '@/types/api'
import MarkdownText from '@/components/MarkdownText.vue'

type ChatMessage = {
  role: AiChatRole
  content: string
  createTime?: string
}

const sessionId = ref<number | null>(null)
const messages = ref<ChatMessage[]>([])
const inputText = ref('')
const sending = ref(false)
const listRef = ref<HTMLElement | null>(null)
let activeEventSource: EventSource | null = null
const route = useRoute()

const contextType = ref<AiChatContextType | null>(null)
const contextId = ref<number | null>(null)
const contextErrorText = ref('')

const storageKey = computed(() => {
  if (!contextType.value || contextId.value == null) return ''
  return `ai_chat:${contextType.value}:${contextId.value}`
})

const quickQuestions = [
  '帮我讲解一个重要知识点',
  '推荐一些学习技巧',
  '如何高效复习？',
  '帮我出一道练习题',
]

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

const parseQueryContext = () => {
  const ctRaw = route.query.contextType
  const cidRaw = route.query.contextId
  const ct = Array.isArray(ctRaw) ? ctRaw[0] : ctRaw
  const cidStr = Array.isArray(cidRaw) ? cidRaw[0] : cidRaw

  if (ct !== 'KNOWLEDGE_POINT' && ct !== 'QUESTION') {
    contextType.value = null
    contextId.value = null
    contextErrorText.value = '请从知识点或题目入口发起 AI 对话'
    return
  }

  const cid = Number(cidStr)
  if (!Number.isFinite(cid) || cid <= 0) {
    contextType.value = null
    contextId.value = null
    contextErrorText.value = '请从知识点或题目入口发起 AI 对话'
    return
  }

  contextType.value = ct
  contextId.value = cid
  contextErrorText.value = ''
}

const restoreSession = async () => {
  if (!storageKey.value) return
  const saved = localStorage.getItem(storageKey.value)
  if (!saved) return
  const id = Number(saved)
  if (!Number.isFinite(id) || id <= 0) return
  try {
    const history = await aiChatApi.history(id)
    sessionId.value = id
    messages.value = history.map((item) => ({
      role: item.role,
      content: item.content,
      createTime: item.createTime,
    }))
    await scrollToBottom()
  } catch {
    localStorage.removeItem(storageKey.value)
  }
}

const ensureSession = async () => {
  if (sessionId.value) return sessionId.value
  if (!contextType.value || contextId.value == null) {
    throw new Error('missing context')
  }
  const startRes = await aiChatApi.start(contextType.value, contextId.value)
  sessionId.value = startRes.sessionId
  if (storageKey.value) {
    localStorage.setItem(storageKey.value, String(startRes.sessionId))
  }
  return startRes.sessionId
}

const sendMessage = async (text: string) => {
  const content = text.trim()
  if (!content) return
  if (sending.value) return

  sending.value = true
  stopStream()
  try {
    messages.value.push({ role: 'USER', content })
    inputText.value = ''
    await scrollToBottom()

    const assistantIndex = messages.value.length
    messages.value.push({ role: 'ASSISTANT', content: '' })
    await scrollToBottom()

    let settled = false
    const settle = () => {
      if (settled) return
      settled = true
      sending.value = false
    }
    let currentSessionId: number
    try {
      currentSessionId = await ensureSession()
    } catch {
      ElMessage.warning(contextErrorText.value || '请从知识点或题目入口发起 AI 对话')
      messages.value.pop()
      settle()
      return
    }

    const done = new Promise<void>((resolve) => {
      try {
        activeEventSource = aiChatSse.openMessageStream(currentSessionId, content, {
          onDelta: (delta) => {
            messages.value[assistantIndex].content += delta
            scrollToBottom()
          },
          onDone: () => {
            stopStream()
            settle()
            resolve()
          },
          onError: async (errorMessage) => {
            stopStream()
            try {
              const res = await aiChatApi.message(currentSessionId, content)
              messages.value[assistantIndex].content = res.assistantMessage
            } catch {
              ElMessage.error(errorMessage || '发送失败')
            } finally {
              settle()
              resolve()
            }
          },
        })
      } catch {
        ;(async () => {
          try {
            const res = await aiChatApi.message(currentSessionId, content)
            messages.value[assistantIndex].content = res.assistantMessage
            await scrollToBottom()
          } catch {
            ElMessage.error('发送失败')
          } finally {
            settle()
            resolve()
          }
        })()
      }
    })

    await done
  } catch {
    ElMessage.error('发送失败')
  } finally {
    sending.value = false
  }
}

const send = () => sendMessage(inputText.value)

const selectQuickQuestion = (question: string) => {
  sendMessage(question)
}

const clearChat = () => {
  messages.value = []
  sessionId.value = null
  inputText.value = ''
}

onUnmounted(() => {
  stopStream()
})

onMounted(async () => {
  parseQueryContext()
  await restoreSession()
})
</script>

<template>
  <div class="ai-direct-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">AI 学习助手</h1>
        <p class="page-desc">随时为你解答学习中的问题</p>
      </div>
      <el-button v-if="messages.length > 0" text @click="clearChat">
        清空对话
      </el-button>
    </div>

    <!-- Chat Container -->
    <div class="chat-container">
      <!-- Messages -->
      <div class="chat-messages" ref="listRef">
        <!-- Empty State -->
        <div v-if="messages.length === 0" class="empty-state">
          <div class="welcome-card">
            <div class="welcome-icon">🤖</div>
            <h2 class="welcome-title">你好，我是你的 AI 学习助手</h2>
            <p class="welcome-desc">我可以帮你解答问题、讲解知识点、推荐学习技巧</p>
          </div>

          <!-- Quick Questions -->
          <div class="quick-questions">
            <p class="quick-label">试试这些问题：</p>
            <div class="quick-grid">
              <button
                v-for="q in quickQuestions"
                :key="q"
                class="quick-btn"
                @click="selectQuickQuestion(q)"
              >
                {{ q }}
              </button>
            </div>
          </div>
        </div>

        <!-- Messages List -->
        <div v-else>
          <div
            v-for="(m, idx) in messages"
            :key="idx"
            class="message-wrapper"
            :class="{ 'message-user': m.role === 'USER' }"
          >
            <div class="message-avatar">
              <span>{{ m.role === 'USER' ? 'U' : 'AI' }}</span>
            </div>
            <div class="message-content">
              <div class="message-header">
                <span class="message-sender">{{ m.role === 'USER' ? '你' : '学习助手' }}</span>
              </div>
              <div class="message-bubble">
                <template v-if="m.role === 'ASSISTANT'">
                  <MarkdownText :content="m.content" />
                  <span v-if="!m.content" class="typing-cursor"></span>
                </template>
                <template v-else>
                  {{ m.content }}
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="chat-input-area">
        <div class="input-container">
          <el-input
            v-model="inputText"
            type="textarea"
            :rows="2"
            placeholder="输入你的问题..."
            resize="none"
            @keydown.enter.exact.prevent="send"
            :disabled="sending"
          />
          <el-button
            type="primary"
            :loading="sending"
            :disabled="!inputText.trim()"
            @click="send"
            class="send-btn"
          >
            发送
          </el-button>
        </div>
        <p class="input-hint">按 Enter 发送，Shift+Enter 换行</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-direct-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 72px - 64px);
  animation: fadeIn 0.4s ease forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--color-border-cream);
}

.page-title {
  font-family: var(--font-serif);
  font-size: 2rem;
  font-weight: 600;
  color: var(--color-near-black);
  margin: 0 0 8px 0;
}

.page-desc {
  font-size: 1rem;
  color: var(--color-olive-gray);
  margin: 0;
}

/* Chat Container */
.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--color-ivory);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-cream);
  overflow: hidden;
}

/* Empty State */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.welcome-card {
  text-align: center;
  margin-bottom: 40px;
}

.welcome-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.welcome-title {
  font-family: var(--font-serif);
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-near-black);
  margin: 0 0 8px 0;
}

.welcome-desc {
  font-size: 1rem;
  color: var(--color-olive-gray);
  margin: 0;
}

.quick-questions {
  width: 100%;
  max-width: 600px;
}

.quick-label {
  font-size: 0.875rem;
  color: var(--color-stone-gray);
  margin: 0 0 12px 0;
  text-align: center;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.quick-btn {
  padding: 16px 20px;
  background: var(--color-parchment);
  border: 1px solid var(--color-border-cream);
  border-radius: var(--radius-md);
  font-size: 0.9375rem;
  color: var(--color-charcoal-warm);
  cursor: pointer;
  transition: all var(--transition-base);
  text-align: left;
}

.quick-btn:hover {
  background: var(--color-warm-sand);
  border-color: var(--color-ring-warm);
  transform: translateY(-1px);
}

/* Messages */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.message-wrapper {
  display: flex;
  gap: 16px;
  animation: slideIn 0.3s ease forwards;
}

.message-wrapper.message-user {
  flex-direction: row-reverse;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-terracotta), var(--color-coral));
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.message-user .message-avatar {
  background: linear-gradient(135deg, var(--color-charcoal-warm), var(--color-olive-gray));
}

.message-content {
  flex: 1;
  max-width: 75%;
}

.message-header {
  margin-bottom: 6px;
}

.message-sender {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-olive-gray);
}

.message-user .message-sender {
  text-align: right;
}

.message-bubble {
  padding: 16px 20px;
  border-radius: var(--radius-lg);
  background: var(--color-parchment);
  line-height: 1.7;
  color: var(--color-charcoal-warm);
}

.message-user .message-bubble {
  background: var(--color-terracotta);
  color: white;
}

.typing-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: var(--color-terracotta);
  margin-left: 2px;
  animation: blink 0.8s infinite;
  vertical-align: text-bottom;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Input Area */
.chat-input-area {
  padding: 16px 24px 24px;
  border-top: 1px solid var(--color-border-cream);
  background: var(--color-ivory);
}

.input-container {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.input-container :deep(.el-textarea__inner) {
  background: var(--color-parchment) !important;
  border-color: var(--color-border-cream) !important;
}

.send-btn {
  height: 42px;
  padding: 0 24px;
  border-radius: var(--radius-md) !important;
  font-weight: 600;
}

.input-hint {
  font-size: 0.75rem;
  color: var(--color-stone-gray);
  margin: 8px 0 0 0;
  text-align: center;
}
</style>