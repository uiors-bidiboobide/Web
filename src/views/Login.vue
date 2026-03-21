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
  loading.value = true
  try {
    const user = isRegister.value
      ? await userApi.register(form)
      : await userApi.login({ username: form.username, password: form.password })
    authStore.setUser(user)
    ElMessage.success(isRegister.value ? '注册成功' : '登录成功')
    router.push('/subjects')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="slogan">用更高的效率学习，拿更多的时间生活。</div>
    <el-card class="login-card">
      <template #header>
        <span>{{ isRegister ? '注册' : '登录' }}</span>
      </template>
      <el-form @submit.prevent="submit">
        <el-form-item label="用户名">
          <el-input v-model="form.username" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" show-password />
        </el-form-item>
        <el-form-item v-if="isRegister" label="邮箱">
          <el-input v-model="form.email" />
        </el-form-item>
        <el-button type="primary" :loading="loading" @click="submit">{{ isRegister ? '注册' : '登录' }}</el-button>
        <el-button text @click="isRegister = !isRegister">
          {{ isRegister ? '已有账号？去登录' : '没有账号？去注册' }}
        </el-button>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  gap: 16px;
}

.login-card {
  width: 420px;
}

.slogan {
  color: #606266;
  font-size: 18px;
  font-weight: 500;
  text-align: center;
}
</style>
