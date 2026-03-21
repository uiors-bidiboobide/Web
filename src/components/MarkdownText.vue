<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const props = defineProps<{
  content: string
}>()

const md = new MarkdownIt({
  html: false, // 禁用原始 HTML
  linkify: true,
  breaks: true, // 把换行也渲染成 <br>
})

// 兼容后端/模型输出中常见的“无空格标题/列表标记”
// 例如：###结论、-条目、1.第1题（Markdown-it 对 ATX heading/list 通常要求空格）
const normalizeMarkdown = (input: string) => {
  let s = input || ''

  // 标题：###结论 -> ### 结论
  s = s.replace(/^(#{1,6})(\S)/gm, '$1 $2')

  // 无序列表：-条目 / *条目 / +条目 -> - 条目
  s = s.replace(/^([*+-])(\S)/gm, '$1 $2')

  // 有序列表：1.第1题 -> 1. 第1题
  s = s.replace(/^(\d+)\.(\S)/gm, '$1. $2')

  // 代码围栏：```python -> ``` python（尽量兼容无空格 info）
  s = s.replace(/^(```|~~~)(\S)/gm, '$1 $2')

  return s
}

const html = computed(() => {
  const raw = md.render(normalizeMarkdown(props.content || ''))
  // 防注入：对 markdown-it 生成的 HTML 做 sanitize
  return DOMPurify.sanitize(raw)
})
</script>

<template>
  <div class="markdown-body" v-html="html" />
</template>

<style scoped>
.markdown-body :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
}

.markdown-body :deep(pre) {
  padding: 12px;
  border-radius: 8px;
  overflow: auto;
  background: rgba(0, 0, 0, 0.04);
}

.markdown-body :deep(pre code) {
  background: transparent;
  padding: 0;
}

.markdown-body :deep(img) {
  max-width: 100%;
}
</style>

