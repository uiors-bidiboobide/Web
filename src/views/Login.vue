<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { userApi } from '@/api/user'
import { useAuthStore } from '@/store/auth'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(false)
const isRegister = ref(false)

const form = reactive({
  username: '',
  password: '',
  email: '',
})

const submit = async () => {
  if (!form.username.trim()) {
    ElMessage.warning('请输入用户名')
    return
  }
  if (!form.password.trim()) {
    ElMessage.warning('请输入密码')
    return
  }
  if (isRegister.value && !form.email.trim()) {
    ElMessage.warning('请输入邮箱')
    return
  }

  loading.value = true
  try {
    const user = isRegister.value
      ? await userApi.register(form)
      : await userApi.login({ username: form.username, password: form.password })
    authStore.setUser(user)
    ElMessage.success(isRegister.value ? '注册成功，欢迎加入！' : '登录成功')
    router.push('/subjects')
  } catch (error: any) {
    ElMessage.error(error.message || (isRegister.value ? '注册失败' : '登录失败'))
  } finally {
    loading.value = false
  }
}

const toggleMode = () => {
  isRegister.value = !isRegister.value
}
</script>

<template>
  <div class="login-page">
    <!-- Background Pattern -->
    <div class="login-bg">
      <div class="bg-shape shape-1"></div>
      <div class="bg-shape shape-2"></div>
      <div class="bg-shape shape-3"></div>
    </div>

    <div class="login-container">
      <!-- Brand Side -->
      <div class="login-brand">
        <div class="brand-content">
          <h1 class="brand-title">智学伴</h1>
          <p class="brand-subtitle">让学习更高效，让知识更扎实</p>
          
          <div class="brand-features">
            <div class="feature-item">
              <span class="feature-icon">✦</span>
              <span class="feature-text">智能知识点生成</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">✦</span>
              <span class="feature-text">个性化学习计划</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">✦</span>
              <span class="feature-text">AI 智能答疑辅导</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Form Side -->
      <div class="login-form-wrapper">
        <div class="login-card">
          <div class="card-header">
            <h2 class="card-title">{{ isRegister ? '创建账号' : '欢迎回来' }}</h2>
            <p class="card-desc">{{ isRegister ? '开始你的学习之旅' : '登录以继续学习' }}</p>
          </div>

          <form @submit.prevent="submit" class="login-form">
            <div class="form-group">
              <label class="form-label">用户名</label>
              <el-input
                v-model="form.username"
                placeholder="请输入用户名"
                size="large"
                :prefix-icon="UserIcon"
              />
            </div>

            <div class="form-group">
              <label class="form-label">密码</label>
              <el-input
                v-model="form.password"
                type="password"
                placeholder="请输入密码"
                size="large"
                show-password
                :prefix-icon="LockIcon"
              />
            </div>

            <div v-if="isRegister" class="form-group">
              <label class="form-label">邮箱</label>
              <el-input
                v-model="form.email"
                type="email"
                placeholder="请输入邮箱（选填）"
                size="large"
                :prefix-icon="MailIcon"
              />
            </div>

            <el-button
              type="primary"
              size="large"
              :loading="loading"
              native-type="submit"
              class="submit-btn"
            >
              {{ isRegister ? '注册' : '登录' }}
            </el-button>
          </form>

          <div class="card-footer">
            <span class="footer-text">{{ isRegister ? '已有账号？' : '没有账号？' }}</span>
            <button type="button" class="toggle-btn" @click="toggleMode">
              {{ isRegister ? '立即登录' : '去注册' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
// Icon components
const UserIcon = {
  template: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
}
const LockIcon = {
  template: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`
}
const MailIcon = {
  template: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-parchment);
  padding: 24px;
  position: relative;
  overflow: hidden;
}

/* Background Shapes */
.login-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.bg-shape {
  position: absolute;
  border-radius: 50%;
  opacity: 0.5;
}

.shape-1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(201, 100, 66, 0.08) 0%, transparent 70%);
  top: -200px;
  right: -100px;
}

.shape-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(201, 100, 66, 0.06) 0%, transparent 70%);
  bottom: -100px;
  left: -100px;
}

.shape-3 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(142, 134, 127, 0.1) 0%, transparent 70%);
  top: 50%;
  left: 30%;
}

/* Container */
.login-container {
  display: flex;
  width: 100%;
  max-width: 1000px;
  background: var(--color-ivory);
  border-radius: 24px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  position: relative;
  z-index: 1;
}

/* Brand Side */
.login-brand {
  flex: 1;
  background: linear-gradient(135deg, var(--color-terracotta) 0%, #a84d32 100%);
  padding: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.login-brand::before {
  content: '';
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

.brand-content {
  position: relative;
  z-index: 1;
  color: white;
  text-align: center;
}

.brand-title {
  font-family: var(--font-serif);
  font-size: 3rem;
  font-weight: 600;
  color: white;
  margin: 0 0 12px 0;
  letter-spacing: -0.02em;
}

.brand-subtitle {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.85);
  margin: 0 0 48px 0;
  line-height: 1.6;
}

.brand-features {
  display: flex;
  flex-direction: column;
  gap: 20px;
  text-align: left;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(8px);
}

.feature-icon {
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.9);
}

.feature-text {
  font-size: 1rem;
  font-weight: 500;
  color: white;
}

/* Form Side */
.login-form-wrapper {
  flex: 1;
  padding: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-card {
  width: 100%;
  max-width: 360px;
  animation: fadeIn 0.5s ease forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-header {
  text-align: center;
  margin-bottom: 32px;
}

.card-title {
  font-family: var(--font-serif);
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--color-near-black);
  margin: 0 0 8px 0;
}

.card-desc {
  font-size: 0.9375rem;
  color: var(--color-olive-gray);
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-charcoal-warm);
}

.submit-btn {
  width: 100%;
  height: 48px;
  font-size: 1rem;
  font-weight: 600;
  margin-top: 8px;
  border-radius: 12px !important;
  background-color: var(--color-terracotta) !important;
  border-color: var(--color-terracotta) !important;
  transition: all var(--transition-base);
}

.submit-btn:hover {
  background-color: var(--color-coral) !important;
  border-color: var(--color-coral) !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(201, 100, 66, 0.3);
}

.card-footer {
  text-align: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border-cream);
}

.footer-text {
  font-size: 0.9375rem;
  color: var(--color-olive-gray);
}

.toggle-btn {
  background: none;
  border: none;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-terracotta);
  cursor: pointer;
  margin-left: 4px;
  padding: 0;
  transition: color var(--transition-fast);
}

.toggle-btn:hover {
  color: var(--color-coral);
  text-decoration: underline;
}

/* Responsive */
@media (max-width: 768px) {
  .login-container {
    flex-direction: column;
  }
  
  .login-brand {
    padding: 32px;
  }
  
  .brand-title {
    font-size: 2rem;
  }
  
  .brand-features {
    display: none;
  }
  
  .login-form-wrapper {
    padding: 32px 24px;
  }
}
</style>