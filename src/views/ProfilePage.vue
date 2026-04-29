<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
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

const router = useRouter()
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

const activeTab = ref('overview')

const todayMinutes = computed(() => {
  const s = profile.value?.todayStudySeconds ?? 0
  return Math.floor(s / 60)
})

const formatTime = (iso: string) => dayjs(iso).format('YYYY-MM-DD HH:mm')

const activityText = (a: RecentActivityItem) => {
  const t = formatTime(a.createTime)
  if (a.activityType === 'STUDY_START') {
    return `于 ${t} 开始了 ${a.subjectName} 学科的学习`
  }
  return `于 ${t} 开始了 ${a.subjectName} 学科的测试`
}

const favoriteTitle = (row: FavoriteItemVO) => {
  if (row.targetType === 'KNOWLEDGE_POINT') {
    return row.knowledgePointName || `知识点 #${row.targetId}`
  }
  return row.questionContentPreview || `题目 #${row.targetId}`
}

const favoriteDetail = (row: FavoriteItemVO) => {
  if (row.targetType === 'KNOWLEDGE_POINT') {
    return row.knowledgePointDescription || '暂无描述'
  }
  return `科目 ID: ${row.questionSubjectId ?? '—'}`
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
  <div class="profile-page">
    <!-- Page Header -->
    <div class="page-header">
      <el-button text @click="router.push('/subjects')" class="back-btn">
        <span class="back-icon">←</span>
        返回
      </el-button>
      <div class="header-content">
        <h1 class="page-title">个人中心</h1>
      </div>
      <div class="header-spacer"></div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="skeleton-profile"></div>
    </div>

    <div v-else class="profile-content">
      <!-- Profile Card -->
      <div class="profile-card" v-if="profile">
        <div class="profile-avatar">
          {{ (profile.username?.trim()?.[0] || 'U').toUpperCase() }}
        </div>
        <div class="profile-info">
          <h2 class="profile-name">{{ profile.username }}</h2>
          <p class="profile-welcome">欢迎回来，继续你的学习之旅</p>
        </div>
        <div class="profile-stats">
          <div class="stat-item">
            <span class="stat-value">{{ todayMinutes }}</span>
            <span class="stat-label">今日学习（分钟）</span>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-container">
        <div class="tabs-header">
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'overview' }"
            @click="activeTab = 'overview'"
          >
            学习概览
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'favorites' }"
            @click="activeTab = 'favorites'"
          >
            我的收藏
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'folders' }"
            @click="activeTab = 'folders'"
          >
            收藏夹管理
          </button>
        </div>

        <!-- Overview Tab -->
        <div v-if="activeTab === 'overview'" class="tab-content">
          <div class="activity-section">
            <h3 class="section-title">最近动态</h3>
            <div v-if="profile?.recentActivities.length" class="activity-list">
              <div
                v-for="(a, idx) in profile.recentActivities"
                :key="idx"
                class="activity-item"
              >
                <span class="activity-icon">{{ a.activityType === 'STUDY_START' ? '📚' : '✍️' }}</span>
                <span class="activity-text">{{ activityText(a) }}</span>
              </div>
            </div>
            <div v-else class="empty-activity">
              <span class="empty-icon">📝</span>
              <p>暂无学习记录，开始你的第一次学习吧</p>
            </div>
          </div>
        </div>

        <!-- Favorites Tab -->
        <div v-if="activeTab === 'favorites'" class="tab-content">
          <!-- Filters -->
          <div class="filters-row">
            <el-select
              v-model="filterFolderId"
              clearable
              placeholder="按收藏夹筛选"
              @change="loadFavorites"
            >
              <el-option v-for="f in folders" :key="f.id" :label="f.name" :value="f.id" />
            </el-select>
            <el-select
              v-model="filterTargetType"
              clearable
              placeholder="类型筛选"
              @change="loadFavorites"
            >
              <el-option label="知识点" value="KNOWLEDGE_POINT" />
              <el-option label="题目" value="QUESTION" />
            </el-select>
            <el-button @click="loadFavorites">刷新</el-button>
          </div>

          <!-- Favorites List -->
          <div class="favorites-list" v-loading="favLoading">
            <div v-if="favorites.length === 0" class="empty-favorites">
              <span class="empty-icon">⭐</span>
              <p>暂无收藏内容</p>
            </div>
            <div
              v-for="row in favorites"
              :key="row.id"
              class="favorite-item"
            >
              <div class="favorite-header">
                <span class="favorite-type" :class="row.targetType === 'KNOWLEDGE_POINT' ? 'type-point' : 'type-question'">
                  {{ row.targetType === 'KNOWLEDGE_POINT' ? '知识点' : '题目' }}
                </span>
                <span class="favorite-time">{{ formatTime(row.createTime) }}</span>
              </div>
              <h4 class="favorite-title">{{ favoriteTitle(row) }}</h4>
              <p class="favorite-detail">{{ favoriteDetail(row) }}</p>
              <p v-if="row.note" class="favorite-note">批注：{{ row.note }}</p>
              <div class="favorite-actions">
                <el-button size="small" @click="openEditFavorite(row)">编辑</el-button>
                <el-button size="small" type="danger" @click="deleteFavorite(row)">取消收藏</el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- Folders Tab -->
        <div v-if="activeTab === 'folders'" class="tab-content">
          <div class="folder-header">
            <h3 class="section-title">收藏夹</h3>
            <el-button type="primary" size="small" @click="openCreateFolder">
              新建收藏夹
            </el-button>
          </div>
          <div class="folders-list">
            <div v-if="folders.length === 0" class="empty-folders">
              <p>暂无收藏夹</p>
            </div>
            <div v-for="folder in folders" :key="folder.id" class="folder-item">
              <span class="folder-name">{{ folder.name }}</span>
              <span class="folder-time">{{ formatTime(folder.createTime) }}</span>
              <div class="folder-actions">
                <el-button size="small" @click="openRenameFolder(folder)">重命名</el-button>
                <el-button size="small" type="danger" @click="deleteFolder(folder)">删除</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Folder Dialog -->
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

    <!-- Edit Favorite Dialog -->
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
  </div>
</template>

<style scoped>
.profile-page {
  animation: fadeIn 0.4s ease forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--color-border-cream);
}

.back-btn {
  color: var(--color-olive-gray) !important;
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
  margin: 0;
  text-align: center;
}

.header-spacer {
  width: 60px;
}

/* Profile Card */
.profile-card {
  background: var(--color-ivory);
  border: 1px solid var(--color-border-cream);
  border-radius: var(--radius-xl);
  padding: 32px;
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 32px;
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-terracotta), var(--color-coral));
  color: white;
  font-size: 2rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.profile-info {
  flex: 1;
}

.profile-name {
  font-family: var(--font-serif);
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--color-near-black);
  margin: 0 0 8px 0;
}

.profile-welcome {
  font-size: 1rem;
  color: var(--color-olive-gray);
  margin: 0;
}

.profile-stats {
  display: flex;
  gap: 32px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-family: var(--font-serif);
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-terracotta);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-olive-gray);
}

/* Tabs */
.tabs-container {
  background: var(--color-ivory);
  border: 1px solid var(--color-border-cream);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.tabs-header {
  display: flex;
  border-bottom: 1px solid var(--color-border-cream);
  background: var(--color-parchment);
}

.tab-btn {
  flex: 1;
  padding: 16px 24px;
  background: none;
  border: none;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-olive-gray);
  cursor: pointer;
  transition: all var(--transition-base);
  position: relative;
}

.tab-btn:hover {
  color: var(--color-near-black);
  background: var(--color-warm-sand);
}

.tab-btn.active {
  color: var(--color-terracotta);
  font-weight: 600;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-terracotta);
}

.tab-content {
  padding: 24px;
}

/* Activity */
.section-title {
  font-family: var(--font-serif);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-near-black);
  margin: 0 0 16px 0;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-parchment);
  border-radius: var(--radius-md);
}

.activity-icon {
  font-size: 1.25rem;
}

.activity-text {
  font-size: 0.9375rem;
  color: var(--color-charcoal-warm);
}

/* Filters */
.filters-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

/* Favorites */
.favorites-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.favorite-item {
  padding: 20px;
  background: var(--color-parchment);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-cream);
}

.favorite-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.favorite-type {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 20px;
  text-transform: uppercase;
}

.type-point {
  background: rgba(74, 124, 89, 0.1);
  color: var(--color-success);
}

.type-question {
  background: rgba(201, 100, 66, 0.1);
  color: var(--color-terracotta);
}

.favorite-time {
  font-size: 0.8125rem;
  color: var(--color-stone-gray);
}

.favorite-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-near-black);
  margin: 0 0 4px 0;
}

.favorite-detail {
  font-size: 0.875rem;
  color: var(--color-olive-gray);
  margin: 0 0 8px 0;
}

.favorite-note {
  font-size: 0.875rem;
  color: var(--color-terracotta);
  margin: 0 0 12px 0;
}

.favorite-actions {
  display: flex;
  gap: 8px;
}

/* Folders */
.folder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.folders-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.folder-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: var(--color-parchment);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-cream);
}

.folder-name {
  flex: 1;
  font-weight: 600;
  color: var(--color-near-black);
}

.folder-time {
  font-size: 0.8125rem;
  color: var(--color-stone-gray);
}

.folder-actions {
  display: flex;
  gap: 8px;
}

/* Empty States */
.empty-activity,
.empty-favorites,
.empty-folders {
  text-align: center;
  padding: 40px;
  color: var(--color-olive-gray);
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 8px;
  display: block;
}

.empty-activity p,
.empty-favorites p,
.empty-folders p {
  margin: 0;
}

/* Loading */
.loading-state {
  padding: 40px;
}

.skeleton-profile {
  height: 160px;
  background: var(--color-border-cream);
  border-radius: var(--radius-xl);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>