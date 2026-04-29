<script setup lang="ts">
import dayjs from 'dayjs'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { subjectApi } from '@/api/subject'
import type { CreateSubjectForm } from '@/types/api'

const router = useRouter()
const loading = ref(false)

const form = reactive<CreateSubjectForm>({
  name: '',
  description: '',
  startDate: dayjs().format('YYYY-MM-DD'),
  endDate: dayjs().add(21, 'day').format('YYYY-MM-DD'),
})

const pollKnowledgePoints = async (subjectId: number) => {
  const maxRetry = 20
  let retry = 0
  while (retry < maxRetry) {
    const result = await subjectApi.getPoints(subjectId)
    if (result.points.length > 0) {
      router.push(`/subject/${subjectId}/knowledge`)
      return
    }
    retry += 1
    await new Promise((resolve) => setTimeout(resolve, 3000))
  }
  ElMessage.warning('知识点生成较慢，请稍后在科目列表中查看')
  router.push('/subjects')
}

const handleSubmit = async () => {
  if (!form.name.trim()) {
    ElMessage.warning('请输入科目名称')
    return
  }
  if (!form.startDate) {
    ElMessage.warning('请选择开始日期')
    return
  }
  if (!form.endDate) {
    ElMessage.warning('请选择结束日期')
    return
  }
  if (dayjs(form.endDate).isBefore(dayjs(form.startDate))) {
    ElMessage.warning('结束日期不能早于开始日期')
    return
  }

  loading.value = true
  try {
    const res = await subjectApi.create(form)
    ElMessage.success('科目创建成功，AI正在生成知识点...')
    if (res.status === 'GENERATING') {
      await pollKnowledgePoints(res.subjectId)
      return
    }
    router.push(`/subject/${res.subjectId}/knowledge`)
  } catch (error: any) {
    ElMessage.error(error.message || '创建失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="create-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <el-button text @click="router.push('/subjects')" class="back-btn">
          <span class="back-icon">←</span>
          返回
        </el-button>
        <div class="header-content">
          <h1 class="page-title">创建科目</h1>
          <p class="page-desc">输入科目信息，开始智能学习之旅</p>
        </div>
      </div>
    </div>

    <!-- Form Card -->
    <div class="form-card">
      <form @submit.prevent="handleSubmit" class="create-form">
        <!-- Subject Name -->
        <div class="form-group">
          <label class="form-label">科目名称 <span class="required">*</span></label>
          <el-input
            v-model="form.name"
            placeholder="例如：高等数学、Python 编程、英语四级"
            size="large"
          />
          <p class="form-hint">输入你想要学习的科目名称</p>
        </div>

        <!-- Description -->
        <div class="form-group">
          <label class="form-label">科目描述</label>
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            placeholder="描述一下这个科目，比如学习目标、重点章节等（选填）"
            resize="none"
          />
        </div>

        <!-- Date Range -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">开始日期 <span class="required">*</span></label>
            <el-date-picker
              v-model="form.startDate"
              value-format="YYYY-MM-DD"
              type="date"
              placeholder="选择开始日期"
              size="large"
              style="width: 100%"
            />
          </div>
          <div class="form-group">
            <label class="form-label">结束日期 <span class="required">*</span></label>
            <el-date-picker
              v-model="form.endDate"
              value-format="YYYY-MM-DD"
              type="date"
              placeholder="选择结束日期"
              size="large"
              style="width: 100%"
            />
          </div>
        </div>

        <!-- Duration Info -->
        <div class="duration-info" v-if="form.startDate && form.endDate">
          <span class="duration-icon">📅</span>
          <span class="duration-text">
            学习周期：<strong>{{ dayjs(form.endDate).diff(dayjs(form.startDate), 'day') + 1 }} 天</strong>
          </span>
        </div>

        <!-- Submit -->
        <div class="form-actions">
          <el-button size="large" @click="router.push('/subjects')">
            取消
          </el-button>
          <el-button type="primary" size="large" :loading="loading" native-type="submit">
            <span v-if="!loading">创建并生成计划</span>
          </el-button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.create-page {
  animation: fadeIn 0.4s ease forwards;
  max-width: 640px;
  margin: 0 auto;
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

/* Form Card */
.form-card {
  background: var(--color-ivory);
  border: 1px solid var(--color-border-cream);
  border-radius: var(--radius-xl);
  padding: 32px;
}

/* Form */
.create-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-charcoal-warm);
}

.required {
  color: var(--color-terracotta);
}

.form-hint {
  font-size: 0.8125rem;
  color: var(--color-stone-gray);
  margin: 0;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

/* Duration Info */
.duration-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: var(--color-parchment);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-cream);
}

.duration-icon {
  font-size: 1.25rem;
}

.duration-text {
  font-size: 0.9375rem;
  color: var(--color-olive-gray);
}

.duration-text strong {
  color: var(--color-terracotta);
}

/* Actions */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-cream);
}

.form-actions :deep(.el-button--primary) {
  padding: 12px 32px;
  font-weight: 600;
}

/* Responsive */
@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>