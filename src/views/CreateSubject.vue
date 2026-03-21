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
      router.push(`/subject/${subjectId}/points`)
      return
    }
    retry += 1
    await new Promise((resolve) => setTimeout(resolve, 3000))
  }
  ElMessage.warning('知识点生成较慢，请稍后在科目列表中查看')
  router.push('/subjects')
}

const handleSubmit = async () => {
  loading.value = true
  try {
    const res = await subjectApi.create(form)
    ElMessage.success('科目创建成功，AI正在生成知识点...')
    if (res.status === 'GENERATING') {
      await pollKnowledgePoints(res.subjectId)
      return
    }
    router.push(`/subject/${res.subjectId}/points`)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <el-card>
    <template #header>创建科目</template>
    <el-form label-width="100px">
      <el-form-item label="科目名称">
        <el-input v-model="form.name" placeholder="如：高等数学" />
      </el-form-item>
      <el-form-item label="科目描述">
        <el-input v-model="form.description" type="textarea" :rows="4" />
      </el-form-item>
      <el-form-item label="开始日期">
        <el-date-picker v-model="form.startDate" value-format="YYYY-MM-DD" type="date" />
      </el-form-item>
      <el-form-item label="结束日期">
        <el-date-picker v-model="form.endDate" value-format="YYYY-MM-DD" type="date" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="handleSubmit">创建并生成计划</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>
