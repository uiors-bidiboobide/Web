<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'

const router = useRouter()
const authStore = useAuthStore()

const logoSrc = new URL('../../img/logo1.jpg', import.meta.url).href

const logout = () => {
  authStore.clearAuth()
  router.push('/login')
}
</script>

<template>
  <el-container class="layout-container">
    <el-header class="layout-header">
      <div class="title" @click="$router.push('/')">
        <img
          class="logo"
          :src="logoSrc"
          alt="Exam-Helper Logo"
        />
        <span>Exam-Helper</span>
      </div>
      <div class="header-actions">
        <el-button type="primary" plain @click="$router.push('/subject/create')">创建科目</el-button>
        <span
          class="user-link"
          role="button"
          tabindex="0"
          @click="router.push('/profile')"
          @keydown.enter.prevent="router.push('/profile')"
        >
          {{ authStore.username || '用户' }}
        </span>
        <el-button @click="logout">退出登录</el-button>
      </div>
    </el-header>
    <el-main>
      <router-view />
    </el-main>
  </el-container>
</template>

<style scoped>
.layout-container {
  min-height: 100vh;
}

.layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.title {
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.logo {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  object-fit: cover;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-link {
  color: var(--el-color-primary);
  cursor: pointer;
  font-weight: 600;
  padding: 0 4px;
}

.user-link:hover {
  text-decoration: underline;
}
</style>
