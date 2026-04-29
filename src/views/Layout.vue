<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { subjectApi } from '@/api/subject'
import { useAuthStore } from '@/store/auth'

const router = useRouter()
const authStore = useAuthStore()

const activeIndex = computed(() => {
  const path = router.currentRoute.value.path
  if (path.startsWith('/subjects')) return '1'
  if (path.includes('/points')) return '2'
  if (path.includes('/plan')) return '3'
  if (path.startsWith('/profile')) return '5'
  return '1'
})

const menuItems = [
  { index: '1', label: '科目列表', path: '/subjects', icon: 'books' },
  { index: '2', label: '知识点', icon: 'lightbulb' },
  { index: '3', label: '学习计划', icon: 'calendar' },
]

const routeToSubjectPage = async (type: 'points' | 'plan') => {
  const subjects = await subjectApi.list()
  if (subjects.length === 0) {
    ElMessage.warning('请先创建科目')
    router.push('/subjects')
    return
  }
  router.push(`/subject/${subjects[0].id}/${type}`)
}

const handleMenuSelect = async (index: string) => {
  if (index === '2') {
    await routeToSubjectPage('points')
    return
  }
  if (index === '3') {
    await routeToSubjectPage('plan')
    return
  }
  const item = menuItems.find(m => m.index === index)
  if (item?.path) router.push(item.path)
}

const logoSrc = new URL('../../img/logo1.jpg', import.meta.url).href

const logout = () => {
  authStore.clearAuth()
  router.push('/login')
}
</script>

<template>
  <div class="app-layout">
    <!-- Header -->
    <header class="app-header">
      <div class="app-header__logo" @click="router.push('/subjects')">
        <img class="app-header__logo-img" :src="logoSrc" alt="Logo" />
        <span class="app-header__logo-text">Exam Helper</span>
      </div>
      
      <div class="app-header__nav">
        <el-menu
          mode="horizontal"
          :ellipsis="false"
          :default-active="activeIndex"
          @select="handleMenuSelect"
          class="header-menu"
        >
          <el-menu-item v-for="item in menuItems" :key="item.index" :index="item.index">
            {{ item.label }}
          </el-menu-item>
        </el-menu>
      </div>

      <div class="app-header__actions">
        <el-button type="primary" @click="router.push('/subject/create')">
          创建科目
        </el-button>
        <el-dropdown trigger="click">
          <span class="user-dropdown">
            <span class="user-avatar">{{ (authStore.username || 'U')[0] }}</span>
            <span class="user-name">{{ authStore.username || '用户' }}</span>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="router.push('/profile')">个人中心</el-dropdown-item>
              <el-dropdown-item divided @click="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <!-- Main Content -->
    <main class="app-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  background-color: var(--color-parchment);
}

/* Header */
.app-header {
  background-color: var(--color-ivory);
  border-bottom: 1px solid var(--color-border-cream);
  padding: 0 var(--space-xl);
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(8px);
}

.app-header__logo {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.app-header__logo:hover {
  opacity: 0.8;
}

.app-header__logo-img {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  object-fit: cover;
}

.app-header__logo-text {
  font-family: var(--font-serif);
  font-size: 1.375rem;
  font-weight: 600;
  color: var(--color-near-black);
  letter-spacing: -0.01em;
}

.app-header__nav {
  flex: 1;
  display: flex;
  justify-content: center;
}

.header-menu {
  border: none !important;
  background: transparent !important;
}

.header-menu :deep(.el-menu-item) {
  font-size: 15px;
  font-weight: 500;
  color: var(--color-olive-gray) !important;
  border-radius: var(--radius-md) !important;
  margin: 0 4px;
  padding: 0 16px !important;
  height: 40px;
  line-height: 40px;
  transition: all var(--transition-base);
}

.header-menu :deep(.el-menu-item:hover) {
  color: var(--color-near-black) !important;
  background-color: var(--color-warm-sand) !important;
}

.header-menu :deep(.el-menu-item.is-active) {
  color: var(--color-ivory) !important;
  background-color: var(--color-terracotta) !important;
}

.app-header__actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  transition: background-color var(--transition-fast);
}

.user-dropdown:hover {
  background-color: var(--color-warm-sand);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--color-terracotta);
  color: var(--color-ivory);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.user-name {
  font-weight: 500;
  color: var(--color-charcoal-warm);
}

/* Content */
.app-content {
  padding: var(--space-xl);
  max-width: 1400px;
  margin: 0 auto;
}
</style>