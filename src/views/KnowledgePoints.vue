<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { subjectApi } from '@/api/subject'
import type { KnowledgePoint } from '@/types/api'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const points = ref<KnowledgePoint[]>([])

const getLevelLabel = (level: number) => {
  const labels: Record<number, string> = {
    1: '基础',
    2: '进阶',
    3: '核心',
    4: '综合'
  }
  return labels[level] || `L${level}`
}

const getLevelColor = (level: number) => {
  const colors: Record<number, string> = {
    1: 'warm',
    2: 'primary',
    3: 'warning',
    4: 'danger'
  }
  return colors[level] || 'warm'
}

const fetchPoints = async () => {
  loading.value = true
  try {
    const res = await subjectApi.getPoints(Number(route.params.id))
    points.value = res.points
  } finally {
    loading.value = false
  }
}

const openAiChat = (knowledgePointId: number) => {
  router.push({
    path: '/ai',
    query: {
      contextType: 'KNOWLEDGE_POINT',
      contextId: String(knowledgePointId)
    }
  })
}

onMounted(fetchPoints)
</script>

<template>
  <div class="knowledge-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <el-button text @click="router.push('/subjects')" class="back-btn">
          <span class="back-icon">←</span>
          返回
        </el-button>
        <div class="header-content">
          <h1 class="page-title">知识点列表</h1>
          <p class="page-desc">系统化掌握每一个知识点</p>
        </div>
      </div>
      <el-button type="primary" @click="router.push(`/subject/${route.params.id}/plan`)">
        学习计划
      </el-button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="points-grid">
      <div v-for="i in 6" :key="i" class="point-card skeleton">
        <div class="skeleton-header"></div>
        <div class="skeleton-text"></div>
        <div class="skeleton-text short"></div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="points.length === 0" class="empty-state">
      <div class="empty-icon">📝</div>
      <h2 class="empty-title">暂无知识点</h2>
      <p class="empty-desc">知识点可能仍在生成中，请稍后再来看看</p>
      <el-button type="primary" @click="router.push(`/subject/${route.params.id}/plan`)">
        查看学习计划
      </el-button>
    </div>

    <!-- Points Grid -->
    <div v-else class="points-grid">
      <div
        v-for="point in points"
        :key="point.id"
        class="point-card"
      >
        <!-- Card Header -->
        <div class="card-header">
          <span class="level-badge" :class="getLevelColor(point.level)">
            {{ getLevelLabel(point.level) }}
          </span>
        </div>

        <!-- Card Body -->
        <div class="card-body">
          <h3 class="card-title">{{ point.name }}</h3>
          <p class="card-desc">{{ point.description }}</p>
        </div>

        <!-- Card Footer -->
        <div class="card-footer">
          <el-button type="primary" size="small" @click="openAiChat(point.id)">
            <span class="btn-icon">🤖</span>
            AI 讲解
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.knowledge-page {
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

/* Empty State */
.empty-state {
  text-align: center;
  padding: 80px 40px;
  background: var(--color-ivory);
  border-radius: var(--radius-xl);
  border: 1px dashed var(--color-border-warm);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.empty-title {
  font-family: var(--font-serif);
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-near-black);
  margin: 0 0 8px 0;
}

.empty-desc {
  font-size: 1rem;
  color: var(--color-olive-gray);
  margin: 0 0 24px 0;
}

/* Points Grid */
.points-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

/* Point Card */
.point-card {
  background: var(--color-ivory);
  border: 1px solid var(--color-border-cream);
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: all var(--transition-base);
}

.point-card:hover {
  border-color: var(--color-ring-warm);
  box-shadow: var(--shadow-card);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.level-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.level-badge.warm {
  background: var(--color-warm-sand);
  color: var(--color-olive-gray);
}

.level-badge.primary {
  background: rgba(201, 100, 66, 0.1);
  color: var(--color-terracotta);
}

.level-badge.warning {
  background: rgba(184, 134, 11, 0.1);
  color: var(--color-warning);
}

.level-badge.danger {
  background: rgba(181, 51, 51, 0.1);
  color: var(--color-error);
}

.card-body {
  flex: 1;
}

.card-title {
  font-family: var(--font-serif);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-near-black);
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.card-desc {
  font-size: 0.9375rem;
  color: var(--color-olive-gray);
  margin: 0;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  padding-top: 16px;
  border-top: 1px solid var(--color-border-cream);
}

.btn-icon {
  margin-right: 4px;
}

/* Skeleton */
.skeleton {
  pointer-events: none;
}

.skeleton-header {
  height: 24px;
  width: 60px;
  background: var(--color-warm-sand);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s infinite;
}

.skeleton-text {
  height: 16px;
  background: var(--color-border-cream);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s infinite;
}

.skeleton-text.short {
  width: 50%;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>