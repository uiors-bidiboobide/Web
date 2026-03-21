import { onBeforeUnmount, onMounted } from 'vue'
import { profileApi } from '@/api/profile'

/**
 * 在「当日学习」页停留期间累计可见时长，每分钟上报一次，卸载时 flush。
 */
export function useStudyDurationReporting() {
  let buffer = 0
  let secTimer: number | undefined
  let flushTimer: number | undefined

  const flush = async () => {
    if (buffer <= 0) return
    const delta = Math.min(buffer, 86400)
    buffer -= delta
    try {
      await profileApi.postStudyDuration({ secondsDelta: delta })
    } catch (e) {
      console.warn('study-duration report failed', e)
    }
  }

  onMounted(() => {
    secTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') buffer += 1
    }, 1000)
    flushTimer = window.setInterval(() => {
      void flush()
    }, 60000)
  })

  onBeforeUnmount(() => {
    void flush()
    if (secTimer !== undefined) window.clearInterval(secTimer)
    if (flushTimer !== undefined) window.clearInterval(flushTimer)
  })
}
