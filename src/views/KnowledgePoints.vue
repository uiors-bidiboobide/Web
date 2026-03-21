<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { subjectApi } from '@/api/subject'
import type { KnowledgePoint } from '@/types/api'
import type { AiChatContextType } from '@/types/api'
import AIChatDialog from '@/components/AIChatDialog.vue'

const route = useRoute()
const loading = ref(false)
const points = ref<KnowledgePoint[]>([])

const aiVisible = ref(false)
const aiContextType = ref<AiChatContextType>('KNOWLEDGE_POINT')
const aiContextId = ref<number>(0)

const fetchPoints = async () => {
  loading.value = true
  try {
    const res = await subjectApi.getPoints(Number(route.params.id))
    points.value = res.points
  } finally {
    loading.value = false
  }
}

const openAi = (knowledgePointId: number) => {
  aiContextType.value = 'KNOWLEDGE_POINT'
  aiContextId.value = knowledgePointId
  aiVisible.value = true
}

onMounted(fetchPoints)
</script>

<template>
  <el-card>
    <template #header>知识点列表</template>
    <el-empty v-if="!loading && points.length === 0" description="暂无知识点，可能仍在生成中" />
    <el-skeleton :loading="loading" :rows="8" animated>
      <el-timeline>
        <el-timeline-item v-for="point in points" :key="point.id">
          <h4>{{ point.name }}（L{{ point.level }}）</h4>
          <p>{{ point.description }}</p>
          <el-button size="small" type="primary" plain @click="openAi(point.id)">AI提问</el-button>
        </el-timeline-item>
      </el-timeline>
    </el-skeleton>
    <el-button type="primary" @click="$router.push(`/subject/${route.params.id}/plan`)">查看学习计划</el-button>
  </el-card>

  <AIChatDialog
    v-model:visible="aiVisible"
    :contextType="aiContextType"
    :contextId="aiContextId"
  />
</template>
