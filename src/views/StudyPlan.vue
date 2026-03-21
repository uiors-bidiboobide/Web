<script setup lang="ts">
import dayjs from 'dayjs'
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { planApi } from '@/api/plan'
import type { StudyPlan } from '@/types/api'

const route = useRoute()
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
  <el-card>
    <template #header>学习计划</template>
    <el-skeleton :loading="loading" :rows="4" animated>
      <el-descriptions v-if="plan" :column="1" border>
        <el-descriptions-item label="科目ID">{{ plan.subjectId }}</el-descriptions-item>
        <el-descriptions-item label="是否已生成">{{ plan.planGenerated ? '是' : '否' }}</el-descriptions-item>
        <el-descriptions-item label="总天数">{{ plan.totalDays }}</el-descriptions-item>
        <el-descriptions-item label="总知识点">{{ plan.totalPoints }}</el-descriptions-item>
      </el-descriptions>
    </el-skeleton>
    <el-button type="primary" @click="$router.push(`/subject/${route.params.id}/daily/${dayjs().format('YYYY-MM-DD')}`)">
      进入今日学习
    </el-button>
  </el-card>
</template>
