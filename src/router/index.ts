import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'

const routes = [
  { path: '/login', component: () => import('@/views/Login.vue') },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    meta: { requiresAuth: true },
    redirect: '/subjects',
    children: [
      { path: 'subjects', component: () => import('@/views/SubjectList.vue') },
      { path: 'subject/create', component: () => import('@/views/CreateSubject.vue') },
      { path: 'subject/:id/points', component: () => import('@/views/KnowledgePoints.vue') },
      { path: 'subject/:id/plan', component: () => import('@/views/StudyPlan.vue') },
      { path: 'subject/:id/daily/:date', component: () => import('@/views/DailyStudy.vue') },
      { path: 'ai/chat', component: () => import('@/views/AIChatPage.vue') },
      { path: 'profile', component: () => import('@/views/ProfilePage.vue') },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  if (to.meta.requiresAuth && !localStorage.getItem('token')) {
    ElMessage.warning('请先登录')
    next('/login')
    return
  }
  next()
})

export default router
