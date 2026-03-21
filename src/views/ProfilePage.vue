<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { favoriteApi } from '@/api/favorite'
import { favoriteFolderApi } from '@/api/favoriteFolder'
import { profileApi } from '@/api/profile'
import type {
  FavoriteFolder,
  FavoriteItemVO,
  FavoriteTargetType,
  ProfileMe,
  RecentActivityItem,
} from '@/types/api'

const loading = ref(false)
const profile = ref<ProfileMe | null>(null)

const folders = ref<FavoriteFolder[]>([])
const favorites = ref<FavoriteItemVO[]>([])
const favLoading = ref(false)

const filterFolderId = ref<number | undefined>(undefined)
const filterTargetType = ref<FavoriteTargetType | ''>('')

const folderFormVisible = ref(false)
const folderForm = reactive({ name: '' })
const folderSubmitting = ref(false)
const editingFolder = ref<FavoriteFolder | null>(null)

const editFavVisible = ref(false)
const editFav = reactive<{ id: number; folderId: number; note: string }>({
  id: 0,
  folderId: 0,
  note: '',
})
const editFavSubmitting = ref(false)

const todayMinutes = computed(() => {
  const s = profile.value?.todayStudySeconds ?? 0
  return Math.floor(s / 60)
})

const formatTime = (iso: string) => dayjs(iso).format('YYYY-MM-DD HH:mm:ss')

const activityText = (a: RecentActivityItem) => {
  const u = profile.value?.username ?? '用户'
  const t = formatTime(a.createTime)
  if (a.activityType === 'STUDY_START') {
    return `用户 ${u}，于 ${t} 开始了 ${a.subjectName} 学科的学习`
  }
  return `用户 ${u}，于 ${t} 开始了 ${a.subjectName} 学科的测试`
}

const favoriteTitle = (row: FavoriteItemVO) => {
  if (row.targetType === 'KNOWLEDGE_POINT') {
    return row.knowledgePointName || `知识点 #${row.targetId}`
  }
  return row.questionContentPreview || `题目 #${row.targetId}`
}

const favoriteDetail = (row: FavoriteItemVO) => {
  if (row.targetType === 'KNOWLEDGE_POINT') {
    return row.knowledgePointDescription || '—'
  }
  return `科目 ID: ${row.questionSubjectId ?? '—'}，关联知识点: ${row.questionKnowledgePointId ?? '—'}`
}

const loadProfile = async () => {
  loading.value = true
  try {
    profile.value = await profileApi.getMe()
  } finally {
    loading.value = false
  }
}

const loadFolders = async () => {
  folders.value = await favoriteFolderApi.list()
}

const loadFavorites = async () => {
  favLoading.value = true
  try {
    favorites.value = await favoriteApi.list({
      folderId: filterFolderId.value,
      targetType: filterTargetType.value || undefined,
    })
  } finally {
    favLoading.value = false
  }
}

const openCreateFolder = () => {
  editingFolder.value = null
  folderForm.name = ''
  folderFormVisible.value = true
}

const openRenameFolder = (row: FavoriteFolder) => {
  editingFolder.value = row
  folderForm.name = row.name
  folderFormVisible.value = true
}

const submitFolder = async () => {
  const name = folderForm.name.trim()
  if (!name) {
    ElMessage.warning('请输入收藏夹名称')
    return
  }
  folderSubmitting.value = true
  try {
    if (editingFolder.value) {
      await favoriteFolderApi.rename(editingFolder.value.id, { name })
      ElMessage.success('已重命名')
    } else {
      await favoriteFolderApi.create({ name })
      ElMessage.success('已创建')
    }
    folderFormVisible.value = false
    await loadFolders()
    await loadFavorites()
  } finally {
    folderSubmitting.value = false
  }
}

const deleteFolder = (row: FavoriteFolder) => {
  ElMessageBox.confirm(`确定删除收藏夹「${row.name}」？其下收藏将一并删除。`, '确认删除', {
    type: 'warning',
  })
    .then(async () => {
      await favoriteFolderApi.remove(row.id)
      ElMessage.success('已删除')
      if (filterFolderId.value === row.id) filterFolderId.value = undefined
      await loadFolders()
      await loadFavorites()
    })
    .catch(() => {})
}

const openEditFavorite = (row: FavoriteItemVO) => {
  editFav.id = row.id
  editFav.folderId = row.folderId
  editFav.note = row.note ?? ''
  editFavVisible.value = true
}

const submitEditFavorite = async () => {
  editFavSubmitting.value = true
  try {
    await favoriteApi.update(editFav.id, {
      folderId: editFav.folderId,
      note: editFav.note.trim(),
    })
    ElMessage.success('已更新')
    editFavVisible.value = false
    await loadFavorites()
  } finally {
    editFavSubmitting.value = false
  }
}

const deleteFavorite = (row: FavoriteItemVO) => {
  ElMessageBox.confirm('确定取消该收藏？', '确认', { type: 'warning' })
    .then(async () => {
      await favoriteApi.remove(row.id)
      ElMessage.success('已取消收藏')
      await loadFavorites()
    })
    .catch(() => {})
}

onMounted(async () => {
  await loadProfile()
  await loadFolders()
  await loadFavorites()
})
</script>

<template>
  <el-card v-loading="loading">
    <template #header>个人主页</template>

    <el-tabs>
      <el-tab-pane label="概览">
        <div v-if="profile" class="overview">
          <p class="welcome">你好，<strong>{{ profile.username }}</strong></p>
          <p class="stat">今日已学习 <strong>{{ todayMinutes }}</strong> 分钟（约 {{ profile.todayStudySeconds }} 秒）</p>
          <el-divider content-position="left">最近动态</el-divider>
          <el-timeline v-if="profile.recentActivities.length">
            <el-timeline-item
              v-for="(a, idx) in profile.recentActivities"
              :key="idx"
              :timestamp="formatTime(a.createTime)"
            >
              {{ activityText(a) }}
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无行为记录" />
        </div>
      </el-tab-pane>

      <el-tab-pane label="收藏">
        <el-space wrap class="fav-filters">
          <el-select
            v-model="filterFolderId"
            clearable
            placeholder="按收藏夹筛选"
            style="width: 200px"
            @change="loadFavorites"
          >
            <el-option v-for="f in folders" :key="f.id" :label="f.name" :value="f.id" />
          </el-select>
          <el-select
            v-model="filterTargetType"
            clearable
            placeholder="类型"
            style="width: 160px"
            @change="loadFavorites"
          >
            <el-option label="知识点" value="KNOWLEDGE_POINT" />
            <el-option label="题目" value="QUESTION" />
          </el-select>
          <el-button @click="loadFavorites">刷新</el-button>
        </el-space>

        <el-table v-loading="favLoading" :data="favorites" stripe style="width: 100%; margin-top: 12px">
          <el-table-column prop="targetType" label="类型" width="120">
            <template #default="{ row }">
              <el-tag :type="row.targetType === 'KNOWLEDGE_POINT' ? 'success' : 'warning'">
                {{ row.targetType === 'KNOWLEDGE_POINT' ? '知识点' : '题目' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="标题 / 摘要" min-width="200">
            <template #default="{ row }">
              <div class="fav-title">{{ favoriteTitle(row) }}</div>
              <div class="fav-sub muted">{{ favoriteDetail(row) }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="folderName" label="收藏夹" width="140" />
          <el-table-column prop="note" label="批注" min-width="120" show-overflow-tooltip />
          <el-table-column prop="createTime" label="收藏时间" width="180">
            <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEditFavorite(row)">编辑</el-button>
              <el-button link type="danger" @click="deleteFavorite(row)">取消收藏</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="收藏夹管理">
        <el-button type="primary" @click="openCreateFolder">新建收藏夹</el-button>
        <el-table :data="folders" style="width: 100%; margin-top: 12px">
          <el-table-column prop="name" label="名称" />
          <el-table-column prop="createTime" label="创建时间" width="200">
            <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <el-button link type="primary" @click="openRenameFolder(row)">重命名</el-button>
              <el-button link type="danger" @click="deleteFolder(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="folderFormVisible"
      :title="editingFolder ? '重命名收藏夹' : '新建收藏夹'"
      width="420px"
      destroy-on-close
    >
      <el-form @submit.prevent>
        <el-form-item label="名称">
          <el-input v-model="folderForm.name" maxlength="64" show-word-limit placeholder="收藏夹名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="folderFormVisible = false">取消</el-button>
        <el-button type="primary" :loading="folderSubmitting" @click="submitFolder">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="editFavVisible" title="编辑收藏" width="480px" destroy-on-close>
      <el-form label-width="88px">
        <el-form-item label="收藏夹">
          <el-select v-model="editFav.folderId" style="width: 100%">
            <el-option v-for="f in folders" :key="f.id" :label="f.name" :value="f.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="批注">
          <el-input v-model="editFav.note" type="textarea" :rows="4" maxlength="2000" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editFavVisible = false">取消</el-button>
        <el-button type="primary" :loading="editFavSubmitting" @click="submitEditFavorite">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<style scoped>
.overview {
  padding: 8px 0;
}

.welcome {
  font-size: 16px;
  margin-bottom: 8px;
}

.stat {
  color: #606266;
  margin-bottom: 16px;
}

.fav-filters {
  margin-bottom: 4px;
}

.fav-title {
  font-weight: 600;
}

.fav-sub {
  font-size: 12px;
  margin-top: 4px;
}

.muted {
  color: #909399;
}
</style>
