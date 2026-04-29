<script setup lang="ts">
import dayjs from 'dayjs'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { planApi } from '@/api/plan'
import type { StudyPlan } from '@/types/api'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const plan = ref<StudyPlan | null>(null)

const fetchPlan = async () => {
  loading.value = true
  try {
    plan.value = await planApi.generate(Number(route.params.id))
  } finally {
    loading.value = false
  }
}

onMounted(fetchPlan)
</script>

<template>
  <div class="plan-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <el-button text @click="router.push(`/subject/${route.params.id}/points`)" class="back-btn">
          <span class="back-icon">←</span>
          返回
        </el-button>
        <div class="header-content">
          <h1 class="page-title">学习计划</h1>
          <p class="page-desc">合理安排你的学习时间</p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="plan-content">
      <div class="loading-card skeleton">
        <div class="skeleton-title"></div>
        <div class="skeleton-stats">
          <div class="skeleton-stat"></div>
          <div class="skeleton-stat"></div>
          <div class="skeleton-stat"></div>
        </div>
      </div>
    </div>

    <!-- Plan Content -->
    <div v-else-if="plan" class="plan-content">
      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-icon">📅</span>
          <div class="stat-info">
            <span class="stat-value">{{ plan.totalDays }}</span>
            <span class="stat-label">总天数</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">📚</span>
          <div class="stat-info">
            <span class="stat-value">{{ plan.totalPoints }}</span>
            <span class="stat-label">知识点</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">✨</span>
          <div class="stat-info">
            <span class="stat-value">{{ plan.planGenerated ? '已生成' : '待生成' }}</span>
            <span class="stat-label">计划状态</span>
          </div>
        </div>
      </div>

      <!-- Action Card -->
      <div class="action-card">
        <div class="action-content">
          <h3 class="action-title">开始今日学习</h3>
          <p class="action-desc">按计划复习，巩固每一个知识点</p>
        </div>
        <el-button type="primary" size="large" @click="router.push(`/subject/${route.params.id}/daily/${dayjs().format('YYYY-MM-DD')}`)">
          进入学习
        </el-button>
      </div>

      <!-- Timeline Hint -->
      <div class="timeline-card">
        <h4 class="timeline-title">学习周期</h4>
        <div class="timeline-range">
          <span class="date">{{ plan.startDate }}</span>
          <div class="timeline-bar">
            <div class="timeline-progress"></div>
          </div>
          <span class="date">{{ plan.endDate }}</span>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">📋</div>
      <h2 class="empty-title">暂无学习计划</h2>
      <p class="empty-desc">创建科目后，系统会自动为你生成学习计划</p>
      <el-button type="primary" @click="router.push('/subjects')">
        返回科目列表
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.plan-page {
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

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--color-ivory);
  border: 1px solid var(--color-border-cream);
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  font-size: 2rem;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-family: var(--font-serif);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-near-black);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-olive-gray);
}

/* Action Card */
.action-card {
  background: linear-gradient(135deg, var(--color-terracotta), #a84d32);
  border-radius: var(--radius-xl);
  padding: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.action-title {
  font-family: var(--font-serif);
  font-size: 1.5rem;
  font-weight: 600;
  color: white;
  margin: 0 0 8px 0;
}

.action-desc {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
}

.action-card :deep(.el-button) {
  background: white !important;
  border-color: white !important;
  color: var(--color-terracotta) !important;
  font-weight: 600;
  padding: 12px 32px;
  height: auto;
}

.action-card :deep(.el-button:hover) {
  background: var(--color-parchment) !important;
  transform: translateY(-1px);
}

/* Timeline Card */
.timeline-card {
  background: var(--color-ivory);
  border: 1px solid var(--color-border-cream);
  border-radius: var(--radius-lg);
  padding: 24px;
}

.timeline-title {
  font-family: var(--font-serif);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-near-black);
  margin: 0 0 20px 0;
}

.timeline-range {
  display: flex;
  align-items: center;
  gap: 16px;
}

.date {
  font-size: 0.875rem;
  color: var(--color-olive-gray);
  font-weight: 500;
}

.timeline-bar {
  flex: 1;
  height: 8px;
  background: var(--color-warm-sand);
  border-radius: 4px;
  overflow: hidden;
}

.timeline-progress {
  height: 100%;
  width: 30%;
  background: linear-gradient(90deg, var(--color-terracotta), var(--color-coral));
  border-radius: 4px;
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

/* Skeleton */
.skeleton {
  pointer-events: none;
}

.skeleton-title {
  height: 32px;
  width: 200px;
  background: var(--color-warm-sand);
  border-radius: var(--radius-sm);
  margin-bottom: 24px;
  animation: pulse 1.5s infinite;
}

.skeleton-stats {
  display: flex;
  gap: 20px;
}

.skeleton-stat {
  flex: 1;
  height: 80px;
  background: var(--color-border-cream);
  border-radius: var(--radius-lg);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Responsive */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .action-card {
    flex-direction: column;
    text-align: center;
    gap: 20px;
  }
}
</style>