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

onMounted(fetchData)
</script>

<template>
  <el-space direction="vertical" fill style="width: 100%">
    <el-card>
      <template #header>
        <div class="list-header">
          <span>科目列表</span>
          <el-button type="primary" @click="$router.push('/subject/create')">新建科目</el-button>
        </div>
      </template>
      <el-empty v-if="!loading && subjects.length === 0" description="暂无科目，先创建一个吧" />
      <el-skeleton :loading="loading" :rows="6" animated>
        <el-space direction="vertical" fill style="width: 100%">
          <el-card v-for="subject in subjects" :key="subject.id" shadow="never">
            <div class="subject-row">
              <div>
                <h3>{{ subject.name }}</h3>
                <p>进度: {{ subject.progress }} 天</p>
                <p>
                  知识点: {{ statsMap[subject.id]?.completed || 0 }} / {{ statsMap[subject.id]?.totalPoints || 0 }}
                </p>
              </div>
              <div class="actions">
                <el-progress
                  :percentage="parseFloat(statsMap[subject.id]?.completionRate || '0')"
                  :status="subject.status === 1 ? 'success' : undefined"
                />
                <el-button @click="$router.push(`/subject/${subject.id}/plan`)">查看计划</el-button>
              </div>
            </div>
          </el-card>
        </el-space>
      </el-skeleton>
    </el-card>
  </el-space>
</template>

<style scoped>
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.subject-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.actions {
  width: 280px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
