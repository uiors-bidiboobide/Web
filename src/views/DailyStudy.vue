<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { planApi } from '@/api/plan'
import { profileApi } from '@/api/profile'
import { recordApi } from '@/api/record'
import { testApi } from '@/api/test'
import FavoriteAddDialog from '@/components/FavoriteAddDialog.vue'
import { useStudyDurationReporting } from '@/composables/useStudyDurationReporting'
import type { DailyPlan, FavoriteTargetType, Question } from '@/types/api'

useStudyDurationReporting()

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const dailyPlan = ref<DailyPlan | null>(null)
const questions = ref<Question[]>([])
const currentAnswers = ref<Record<number, string>>({})

const subjectId = computed(() => Number(route.params.id))
const currentDate = computed(() => (route.params.date as string) || dayjs().format('YYYY-MM-DD'))

// Test state machine
type TestViewStatus = 'IDLE' | 'GENERATING' | 'READY' | 'FAILED'
type QuestionOptionLayout = 'single' | 'double' | 'quad'
const testStatus = ref<TestViewStatus>('IDLE')
const testId = ref<string | null>(null)
const testError = ref('')
const inTestView = ref(false)
const questionsLoading = ref(false)
let pollTimer: number | undefined = undefined

const openAiKnowledgePoint = (knowledgePointId: number) => {
  router.push({
    path: '/ai',
    query: { contextType: 'KNOWLEDGE_POINT', contextId: knowledgePointId },
  })
}

const openAiQuestion = (questionId: number) => {
  router.push({
    path: '/ai',
    query: { contextType: 'QUESTION', contextId: questionId },
  })
}

const favoriteDialogVisible = ref(false)
const favoriteTargetType = ref<FavoriteTargetType>('KNOWLEDGE_POINT')
const favoriteTargetId = ref(0)

const openFavorite = (targetType: FavoriteTargetType, targetId: number) => {
  favoriteTargetType.value = targetType
  favoriteTargetId.value = targetId
  favoriteDialogVisible.value = true
}

const clearPoll = () => {
  if (pollTimer !== undefined) {
    window.clearInterval(pollTimer)
    pollTimer = undefined
  }
}

const fetchDailyPlan = async () => {
  loading.value = true
  try {
    dailyPlan.value = await planApi.getDaily(subjectId.value, currentDate.value)
  } finally {
    loading.value = false
  }
}

const markComplete = async (pointId: number) => {
  await recordApi.complete({ knowledgePointId: pointId, subjectId: subjectId.value })
  ElMessage.success('已标记完成')
  await fetchDailyPlan()
}

const deferPoint = async (pointId: number) => {
  if (!dailyPlan.value) return
  await recordApi.defer({
    knowledgePointId: pointId,
    subjectId: subjectId.value,
    fromDate: dailyPlan.value.date,
  })
  ElMessage.success('已顺延至明天')
  await fetchDailyPlan()
}

const generateTest = async () => {
  if (!dailyPlan.value) return

  clearPoll()
  questions.value = []
  currentAnswers.value = {}
  inTestView.value = false
  questionsLoading.value = false
  testError.value = ''
  testId.value = null

  testStatus.value = 'GENERATING'

  try {
    const res = await testApi.generate(subjectId.value, currentDate.value)
    testId.value = res.testId
    testStatus.value = res.status === 'READY' ? 'READY' : 'GENERATING'

    if (res.status === 'GENERATING') {
      const startedAt = Date.now()
      pollTimer = window.setInterval(async () => {
        try {
          const statusRes = await testApi.getStatus(subjectId.value, currentDate.value)
          testId.value = statusRes.testId

          if (statusRes.status === 'READY') {
            testStatus.value = 'READY'
            clearPoll()
            return
          }
          if (statusRes.status === 'FAILED') {
            testStatus.value = 'FAILED'
            testError.value = statusRes.error || '生成失败'
            clearPoll()
            return
          }

          if (Date.now() - startedAt > 120000) {
            testStatus.value = 'FAILED'
            testError.value = '生成超时'
            clearPoll()
          }
        } catch {
          testStatus.value = 'FAILED'
          testError.value = '状态获取失败'
          clearPoll()
        }
      }, 2000)
    }
  } catch {
    testStatus.value = 'FAILED'
    testError.value = '生成失败'
  }
}

const enterTest = async () => {
  if (!dailyPlan.value) return
  if (testStatus.value !== 'READY') return
  if (!testId.value) return

  inTestView.value = false
  questions.value = []
  currentAnswers.value = {}
  questionsLoading.value = true
  testError.value = ''

  try {
    const res = await testApi.getQuestions(subjectId.value, currentDate.value)
    testId.value = res.testId

    if (res.status === 'READY') {
      questions.value = res.questions
      inTestView.value = true
      profileApi.postActivity({ activityType: 'TEST_START', subjectId: subjectId.value }).catch(() => {})
    } else {
      testStatus.value = 'FAILED'
      testError.value = res.error || '尚未就绪'
    }
  } catch {
    testStatus.value = 'FAILED'
    testError.value = '获取题目失败'
  } finally {
    questionsLoading.value = false
  }
}

const submitTest = async () => {
  if (!dailyPlan.value) return
  if (!inTestView.value) return
  if (questions.value.length === 0) return

  const hasMissing = questions.value.some((q) => currentAnswers.value[q.id] == null)
  if (hasMissing) {
    ElMessage.warning('请先选择所有题目的答案')
    return
  }

  const answers = Object.entries(currentAnswers.value).map(([questionId, userAnswer]) => ({
    questionId: Number(questionId),
    userAnswer,
  }))

  const result = await testApi.submit(subjectId.value, currentDate.value, answers)
  if (result.isPass) {
    ElMessage.success(`测试通过！得分: ${result.score}`)
  } else {
    ElMessage.warning(`未通过，得分: ${result.score}，建议重新复习`)
  }
}

const getQuestionOptions = (q: Question) => Object.entries(q.options)

const getOptionLayout = (q: Question): QuestionOptionLayout => {
  const optionTexts = Object.values(q.options).map((text) => String(text ?? '').trim())
  const maxLength = optionTexts.reduce((max, text) => Math.max(max, text.length), 0)
  if (optionTexts.length >= 4 && maxLength <= 8) return 'quad'
  if (maxLength <= 18) return 'double'
  return 'single'
}

const boot = async () => {
  await fetchDailyPlan()
  profileApi.postActivity({ activityType: 'STUDY_START', subjectId: subjectId.value }).catch(() => {})
}

onMounted(boot)
onUnmounted(() => clearPoll())
</script>

<template>
  <div class="daily-study-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <el-button text @click="router.push(`/subject/${route.params.id}/plan`)" class="back-btn">
          <span class="back-icon">←</span>
          返回
        </el-button>
        <div class="header-content">
          <h1 class="page-title">{{ currentDate }}</h1>
          <p class="page-desc">今日学习计划</p>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="skeleton-card"></div>
    </div>

    <div v-else-if="dailyPlan" class="study-content">
      <!-- Knowledge Points -->
      <section class="section">
        <h2 class="section-title">
          <span class="section-icon">📚</span>
          今日知识点
        </h2>
        <div class="points-list">
          <div
            v-for="point in dailyPlan.knowledgePoints"
            :key="point.id"
            class="point-card"
            :class="{ completed: point.completedToday }"
          >
            <div class="point-header">
              <span class="level-badge" :class="'level-' + Math.min(point.level, 4)">
                L{{ point.level }}
              </span>
              <span v-if="point.completedToday" class="completed-badge">已完成</span>
            </div>
            <h3 class="point-name">{{ point.name }}</h3>
            <p class="point-desc">{{ point.description }}</p>
            <div class="point-actions">
              <el-button
                v-if="!point.completedToday"
                type="primary"
                size="small"
                @click="markComplete(point.id)"
              >
                标记完成
              </el-button>
              <el-button
                v-if="!point.completedToday"
                size="small"
                @click="deferPoint(point.id)"
              >
                顺延明天
              </el-button>
              <el-button size="small" type="primary" @click="openAiKnowledgePoint(point.id)">
                AI 讲解
              </el-button>
              <el-button size="small" @click="openFavorite('KNOWLEDGE_POINT', point.id)">
                收藏
              </el-button>
            </div>
          </div>
        </div>
      </section>

      <!-- Test Section -->
      <section class="section">
        <h2 class="section-title">
          <span class="section-icon">✍️</span>
          今日测试
        </h2>

        <!-- Idle State -->
        <div v-if="testStatus === 'IDLE'" class="test-card">
          <div class="test-content">
            <p class="test-desc">检验今日学习成果，巩固知识点</p>
            <el-button type="primary" size="large" @click="generateTest">
              生成测试题目
            </el-button>
          </div>
        </div>

        <!-- Generating -->
        <div v-else-if="testStatus === 'GENERATING'" class="test-card generating">
          <div class="generating-indicator">
            <div class="spinner"></div>
            <p>题目生成中，请稍候...</p>
          </div>
          <el-button type="primary" disabled>等待生成完毕</el-button>
        </div>

        <!-- Failed -->
        <div v-else-if="testStatus === 'FAILED'" class="test-card failed">
          <div class="failed-content">
            <span class="failed-icon">!</span>
            <p>{{ testError || '生成失败，请稍后重试' }}</p>
          </div>
          <el-button type="primary" @click="generateTest">重新生成</el-button>
        </div>

        <!-- Ready -->
        <div v-else class="test-card ready">
          <div class="ready-content">
            <span class="ready-icon">✓</span>
            <p>题目已生成，准备就绪</p>
          </div>
          <el-button type="primary" size="large" @click="enterTest" :disabled="questionsLoading">
            进入测试
          </el-button>
        </div>

        <!-- Test Questions -->
        <div v-if="inTestView" class="test-questions">
          <el-divider />
          <h3 class="test-title">答题</h3>
          <div v-loading="questionsLoading" class="questions-list">
            <div
              v-for="(q, qIndex) in questions"
              :key="q.id"
              class="question-card"
            >
              <div class="question-number">第 {{ qIndex + 1 }} 题</div>
              <p class="question-content">{{ q.content }}</p>
              <el-radio-group
                v-model="currentAnswers[q.id]"
                :class="['question-options', `question-options--${getOptionLayout(q)}`]"
              >
                <el-radio
                  v-for="[key, text] in getQuestionOptions(q)"
                  :key="key"
                  :label="key"
                  class="option-item"
                >
                  <strong>{{ key }}.</strong> {{ text }}
                </el-radio>
              </el-radio-group>
              <div class="question-actions">
                <el-button size="small" type="primary" @click="openAiQuestion(q.id)">
                  AI 讲解
                </el-button>
                <el-button size="small" @click="openFavorite('QUESTION', q.id)">
                  收藏
                </el-button>
              </div>
            </div>
          </div>
          <el-button
            type="primary"
            size="large"
            @click="submitTest"
            :disabled="questionsLoading"
            class="submit-btn"
          >
            提交测试
          </el-button>
        </div>
      </section>
    </div>

    <FavoriteAddDialog
      v-model="favoriteDialogVisible"
      :target-type="favoriteTargetType"
      :target-id="favoriteTargetId"
    />
  </div>
</template>

<style scoped>
.daily-study-page {
  animation: fadeIn 0.4s ease forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Header */
.page-header {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--color-border-cream);
}

.header-left {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.back-btn {
  color: var(--color-olive-gray) !important;
  padding-top: 4px;
}

.back-btn:hover {
  color: var(--color-terracotta) !important;
}

.back-icon {
  margin-right: 4px;
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

/* Sections */
.study-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.section {
  background: var(--color-ivory);
  border: 1px solid var(--color-border-cream);
  border-radius: var(--radius-xl);
  padding: 24px;
}

.section-title {
  font-family: var(--font-serif);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-near-black);
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-icon {
  font-size: 1.5rem;
}

/* Points List */
.points-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.point-card {
  padding: 20px;
  background: var(--color-parchment);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-cream);
  transition: all var(--transition-base);
}

.point-card.completed {
  opacity: 0.7;
  background: rgba(74, 124, 89, 0.05);
}

.point-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.level-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 20px;
  background: var(--color-warm-sand);
  color: var(--color-olive-gray);
}

.level-badge.level-3,
.level-badge.level-4 {
  background: rgba(201, 100, 66, 0.1);
  color: var(--color-terracotta);
}

.completed-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 20px;
  background: rgba(74, 124, 89, 0.1);
  color: var(--color-success);
}

.point-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-near-black);
  margin: 0 0 8px 0;
}

.point-desc {
  font-size: 0.9375rem;
  color: var(--color-olive-gray);
  margin: 0 0 16px 0;
  line-height: 1.6;
}

.point-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* Test Cards */
.test-card {
  padding: 32px;
  background: var(--color-parchment);
  border-radius: var(--radius-lg);
  border: 1px dashed var(--color-border-warm);
  text-align: center;
}

.test-content,
.generating-indicator,
.failed-content,
.ready-content {
  margin-bottom: 20px;
}

.test-desc {
  font-size: 1rem;
  color: var(--color-olive-gray);
  margin: 0 0 20px 0;
}

.generating-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border-cream);
  border-top-color: var(--color-terracotta);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.failed-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.failed-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(181, 51, 51, 0.1);
  color: var(--color-error);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ready-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.ready-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(74, 124, 89, 0.1);
  color: var(--color-success);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Questions */
.test-questions {
  margin-top: 24px;
}

.test-title {
  font-family: var(--font-serif);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-near-black);
  margin: 0 0 20px 0;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.question-card {
  padding: 20px;
  background: var(--color-parchment);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-cream);
}

.question-number {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-terracotta);
  margin-bottom: 12px;
}

.question-content {
  font-size: 1rem;
  color: var(--color-near-black);
  margin: 0 0 16px 0;
  line-height: 1.6;
}

.question-options {
  width: 100%;
  display: grid;
  gap: 8px;
  text-align: left;
}

.question-options--single {
  grid-template-columns: 1fr;
}

.question-options--double {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.question-options--quad {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.option-item {
  margin: 0 !important;
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  background: var(--color-ivory);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-cream);
  transition: all var(--transition-fast);
  line-height: 1.5;
}

.option-item :deep(.el-radio__label) {
  white-space: normal;
  line-height: 1.5;
}

.option-item:hover {
  border-color: var(--color-ring-warm);
}

.question-actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}

.submit-btn {
  width: 100%;
  margin-top: 24px;
}

/* Loading */
.loading-state {
  padding: 40px;
}

.skeleton-card {
  height: 300px;
  background: var(--color-border-cream);
  border-radius: var(--radius-xl);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>