import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { User } from '@/types/api'

const TOKEN_KEY = 'token'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || '')
  const username = ref('')
  const userId = ref<number | null>(null)

  const isAuthenticated = computed(() => Boolean(token.value))

  const setUser = (user: User) => {
    token.value = user.token
    username.value = user.username
    userId.value = user.userId
    localStorage.setItem(TOKEN_KEY, user.token)
  }

  const clearAuth = () => {
    token.value = ''
    username.value = ''
    userId.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  return {
    token,
    username,
    userId,
    isAuthenticated,
    setUser,
    clearAuth,
  }
})
