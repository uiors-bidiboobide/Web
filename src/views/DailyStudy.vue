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

// 测试状态机（由后端状态机驱动）
type TestViewStatus = 'IDLE' | 'GENERATING' | 'READY' | 'FAILED'
const testStatus = ref<TestViewStatus>('IDLE')
const testId = ref<string | null>(null)
const testError = ref('')
const inTestView = ref(false)
const questionsLoading = ref(false)
let pollTimer: number | undefined = undefined

const openAiKnowledgePoint = (knowledgePointId: number) => {
  router.push({
    path: '/ai/chat',
    query: { contextType: 'KNOWLEDGE_POINT', contextId: knowledgePointId },
  })
}

const openAiQuestion = (questionId: number) => {
  router.push({
    path: '/ai/chat',
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

  const dateStr = dailyPlan.value.date
  testStatus.value = 'GENERATING'

  try {
    const res = await testApi.generate(subjectId.value, dateStr)
    testId.value = res.testId
    testStatus.value = res.status === 'READY' ? 'READY' : 'GENERATING'

    // manualEnter 模式：READY 后不自动拉取 questions
    if (res.status === 'GENERATING') {
      const startedAt = Date.now()
      pollTimer = window.setInterval(async () => {
        try {
          const statusRes = await testApi.getStatus(subjectId.value, dateStr)
          testId.value = statusRes.testId

          if (statusRes.status === 'READY') {
            testStatus.value = 'READY'
            clearPoll()
            return
          }
          if (statusRes.status === 'FAILED') {
            testStatus.value = 'FAILED'
            testError.value = statusRes.error || '生成失败，稍后重试'
            clearPoll()
            return
          }

          // 超时兜底
          if (Date.now() - startedAt > 120000) {
            testStatus.value = 'FAILED'
            testError.value = '生成超时，请稍后重试'
            clearPoll()
          }
        } catch {
          testStatus.value = 'FAILED'
          testError.value = '生成状态获取失败，请稍后重试'
          clearPoll()
        }
      }, 2000)
    }
  } catch {
    testStatus.value = 'FAILED'
    testError.value = '生成失败，请稍后重试'
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
    const res = await testApi.getQuestions(subjectId.value, dailyPlan.value.date)
    testId.value = res.testId

    if (res.status === 'READY') {
      questions.value = res.questions
      inTestView.value = true
      profileApi
        .postActivity({ activityType: 'TEST_START', subjectId: subjectId.value })
        .catch((e) => console.warn('TEST_START activity failed', e))
    } else {
      testStatus.value = 'FAILED'
      testError.value = res.error || '生成尚未就绪，请稍后重试'
    }
  } catch {
    testStatus.value = 'FAILED'
    testError.value = '获取题目失败，请稍后重试'
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

  const result = await testApi.submit(subjectId.value, dailyPlan.value.date, answers)
  if (result.isPass) {
    ElMessage.success(`测试通过！得分: ${result.score}`)
  } else {
    ElMessage.warning(`未通过，得分: ${result.score}，建议重新复习`)
  }
}

const boot = async () => {
  await fetchDailyPlan()
  profileApi.postActivity({ activityType: 'STUDY_START', subjectId: subjectId.value }).catch((e) => {
    console.warn('STUDY_START activity failed', e)
  })
}

onMounted(boot)
onUnmounted(() => clearPoll())
</script>

<template>
  <el-card v-loading="loading">
    <template #header>{{ currentDate }} 学习计划</template>
    <div v-if="dailyPlan">
      <el-card v-for="point in dailyPlan.knowledgePoints" :key="point.id" shadow="never" class="point-card">
        <h3>
          {{ point.name }}
          <el-tag :type="point.level > 3 ? 'danger' : 'info'">Level {{ point.level }}</el-tag>
        </h3>
        <p>{{ point.description }}</p>
        <el-space>
          <el-button v-if="!point.completedToday" type="primary" @click="markComplete(point.id)">标记完成</el-button>
          <el-button v-if="!point.completedToday" @click="deferPoint(point.id)">顺延至明天</el-button>
          <el-button type="primary" size="small" plain @click="openAiKnowledgePoint(point.id)">AI讲解</el-button>
          <el-button size="small" @click="openFavorite('KNOWLEDGE_POINT', point.id)">收藏</el-button>
          <el-tag v-if="point.completedToday" type="success">已完成</el-tag>
        </el-space>
      </el-card>

      <el-divider />

      <!-- 测试状态区：任何非 READY 状态不渲染题目内容 -->
      <div v-if="testStatus === 'IDLE'">
        <el-button type="primary" @click="generateTest">生成当日测试</el-button>
      </div>

      <div v-else-if="testStatus === 'GENERATING'">
        <el-alert
          type="info"
          :closable="false"
          show-icon
          title="题目生成中，请稍后…"
          style="margin-bottom: 12px"
        />
        <el-button type="primary" :disabled="true">等待生成完毕</el-button>
      </div>

      <div v-else-if="testStatus === 'FAILED'">
        <el-alert
          type="error"
          :closable="false"
          show-icon
          :title="testError || '生成失败，稍后重试'"
          style="margin-bottom: 12px"
        />
        <el-button type="primary" @click="generateTest">生成当日测试</el-button>
      </div>

      <div v-else>
        <el-alert type="success" :closable="false" show-icon title="生成完毕" style="margin-bottom: 12px" />
        <el-button type="primary" @click="enterTest" :disabled="questionsLoading">进入测试</el-button>

        <div v-if="inTestView">
          <el-divider />
          <h3>今日测试</h3>
          <el-skeleton :loading="questionsLoading" :rows="6" animated>
            <div v-for="q in questions" :key="q.id" class="question-item">
              <p>{{ q.content }}</p>
              <el-radio-group v-model="currentAnswers[q.id]">
                <el-radio v-for="(text, key) in q.options" :key="key" :label="key">{{ key }}. {{ text }}</el-radio>
              </el-radio-group>
              <div class="question-ai-row">
                <el-button size="small" type="primary" plain @click="openAiQuestion(q.id)">AI讲解</el-button>
                <el-button size="small" @click="openFavorite('QUESTION', q.id)">收藏</el-button>
              </div>
            </div>
          </el-skeleton>
          <el-button type="primary" @click="submitTest" :disabled="questionsLoading">提交测试</el-button>
        </div>
      </div>
    </div>

    <FavoriteAddDialog
      v-model="favoriteDialogVisible"
      :target-type="favoriteTargetType"
      :target-id="favoriteTargetId"
    />
  </el-card>
</template>

<style scoped>
.point-card {
  margin-bottom: 12px;
}

.question-item {
  margin-bottom: 16px;
}

.question-ai-row {
  margin-top: 8px;
}
</style>
