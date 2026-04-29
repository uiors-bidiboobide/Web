import axios, { type AxiosError } from 'axios'
import { ElMessage } from 'element-plus'
import type { ApiResponse } from '@/types/api'
import router from '@/router'

const request = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

const redirectToLoginOnUnauthorized = () => {
  localStorage.removeItem('token')
  if (router.currentRoute.value.path !== '/login') {
    router.push('/login')
  }
}

request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

request.interceptors.response.use(
  ((response: any) => {
    const payload = response.data as ApiResponse<unknown>
    const { code, message, data } = payload
    if (code === 200) {
      return data as unknown
    }
    if (code === 401) {
      redirectToLoginOnUnauthorized()
    }
    ElMessage.error(message || '请求失败')
    return Promise.reject(new Error(message || '请求失败'))
  }) as any,
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response?.status === 401) {
      redirectToLoginOnUnauthorized()
    }
    ElMessage.error(error.response?.data?.message || error.message || '网络异常')
    return Promise.reject(error)
  },
)

export default request
