<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { subjectApi } from '@/api/subject'
import { recordApi } from '@/api/record'
import type { StudyStatistics, Subject } from '@/types/api'

const loading = ref(false)
const subjects = ref<Subject[]>([])
const statsMap = ref<Record<number, StudyStatistics>>({})

const fetchData = async () => {
  loading.value = true
  try {
    subjects.value = await subjectApi.list()
    const statsEntries = await Promise.all(
      subjects.value.map(async (subject) => {
        const stats = await recordApi.getStatistics(subject.id)
        return [subject.id, stats] as const
      }),
    )
    statsMap.value = Object.fromEntries(statsEntries)
  } finally {
    loading.value = false
  }
}

const getCompletionPercentage = (subject: Subject) => {
  const stats = statsMap.value[subject.id]
  if (!stats || stats.totalPoints === 0) return 0
  return Math.round((stats.completed / stats.totalPoints) * 100)
}

const getCompletedCount = (subjectId: number) => {
  return statsMap.value[subjectId]?.completed || 0
}

const getTotalCount = (subjectId: number) => {
  return statsMap.value[subjectId]?.totalPoints || 0
}

onMounted(fetchData)
</script>

<template>
  <div class="subject-list-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">我的科目</h1>
        <p class="page-desc">管理你的学习科目，跟踪学习进度</p>
      </div>
      <el-button type="primary" size="large" @click="$router.push('/subject/create')">
        <span class="btn-icon">+</span>
        新建科目
      </el-button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="subject-grid">
      <div v-for="i in 3" :key="i" class="subject-card skeleton">
        <div class="skeleton-title"></div>
        <div class="skeleton-text"></div>
        <div class="skeleton-text short"></div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="subjects.length === 0" class="empty-state">
      <div class="empty-icon">📚</div>
      <h2 class="empty-title">还没有科目</h2>
      <p class="empty-desc">创建你的第一个科目，开始智能学习之旅</p>
      <el-button type="primary" size="large" @click="$router.push('/subject/create')">
        创建科目
      </el-button>
    </div>

    <!-- Subject Grid -->
    <div v-else class="subject-grid">
      <div
        v-for="subject in subjects"
        :key="subject.id"
        class="subject-card"
        @click="$router.push(`/subject/${subject.id}/points`)"
      >
        <!-- Card Header -->
        <div class="card-header">
          <div class="card-badge" :class="{ active: subject.status === 1 }">
            {{ subject.status === 1 ? '进行中' : '未开始' }}
          </div>
        </div>

        <!-- Card Body -->
        <div class="card-body">
          <h3 class="card-title">{{ subject.name }}</h3>
          <p class="card-desc">{{ subject.description || '暂无描述' }}</p>
        </div>

        <!-- Card Stats -->
        <div class="card-stats">
          <div class="stat-item">
            <span class="stat-value">{{ subject.progress }}</span>
            <span class="stat-label">天</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">{{ getCompletedCount(subject.id) }}</span>
            <span class="stat-label">/ {{ getTotalCount(subject.id) }} 掌握</span>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="card-progress">
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: getCompletionPercentage(subject) + '%' }"
            ></div>
          </div>
          <span class="progress-text">{{ getCompletionPercentage(subject) }}%</span>
        </div>

        <!-- Card Footer -->
        <div class="card-footer">
          <el-button size="small" @click.stop="$router.push(`/subject/${subject.id}/plan`)">
            学习计划
          </el-button>
          <el-button type="primary" size="small" plain @click.stop="$router.push(`/subject/${subject.id}/points`)">
            查看详情
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.subject-list-page {
  animation: fadeIn 0.4s ease forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
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

.btn-icon {
  margin-right: 4px;
  font-weight: 600;
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

/* Subject Grid */
.subject-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

/* Subject Card */
.subject-card {
  background: var(--color-ivory);
  border: 1px solid var(--color-border-cream);
  border-radius: var(--radius-xl);
  padding: 24px;
  cursor: pointer;
  transition: all var(--transition-base);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.subject-card:hover {
  border-color: var(--color-ring-warm);
  box-shadow: var(--shadow-whisper);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
  background: var(--color-warm-sand);
  color: var(--color-olive-gray);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-badge.active {
  background: rgba(201, 100, 66, 0.1);
  color: var(--color-terracotta);
}

.card-body {
  flex: 1;
}

.card-title {
  font-family: var(--font-serif);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-near-black);
  margin: 0 0 8px 0;
}

.card-desc {
  font-size: 0.9375rem;
  color: var(--color-olive-gray);
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Stats */
.card-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: var(--color-parchment);
  border-radius: var(--radius-md);
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-terracotta);
  font-family: var(--font-serif);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-olive-gray);
}

.stat-divider {
  width: 1px;
  height: 20px;
  background: var(--color-border-warm);
}

/* Progress */
.card-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--color-warm-sand);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-terracotta), var(--color-coral));
  border-radius: 3px;
  transition: width 0.5s ease;
}

.progress-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-olive-gray);
  min-width: 40px;
  text-align: right;
}

/* Card Footer */
.card-footer {
  display: flex;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-cream);
}

/* Skeleton */
.skeleton {
  pointer-events: none;
}

.skeleton-title {
  height: 28px;
  background: var(--color-warm-sand);
  border-radius: var(--radius-sm);
  width: 60%;
  animation: pulse 1.5s infinite;
}

.skeleton-text {
  height: 16px;
  background: var(--color-border-cream);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s infinite;
}

.skeleton-text.short {
  width: 40%;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>