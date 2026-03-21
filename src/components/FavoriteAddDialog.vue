<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { favoriteApi } from '@/api/favorite'
import { favoriteFolderApi } from '@/api/favoriteFolder'
import type { FavoriteFolder, FavoriteTargetType } from '@/types/api'

const props = defineProps<{
  modelValue: boolean
  targetType: FavoriteTargetType
  targetId: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'success'): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const folders = ref<FavoriteFolder[]>([])
const folderId = ref<number | undefined>(undefined)
const note = ref('')
const loading = ref(false)
const submitting = ref(false)

const newFolderName = ref('')
const creatingFolder = ref(false)
const showNewFolder = ref(false)

const loadFolders = async () => {
  loading.value = true
  try {
    folders.value = await favoriteFolderApi.list()
    if (folders.value.length && folderId.value == null) {
      folderId.value = folders.value[0].id
    }
  } finally {
    loading.value = false
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      note.value = ''
      newFolderName.value = ''
      showNewFolder.value = false
      folderId.value = undefined
      void loadFolders()
    }
  },
)

const createFolder = async () => {
  const name = newFolderName.value.trim()
  if (!name) {
    ElMessage.warning('请输入收藏夹名称')
    return
  }
  creatingFolder.value = true
  try {
    const created = await favoriteFolderApi.create({ name })
    ElMessage.success('收藏夹已创建')
    folders.value = await favoriteFolderApi.list()
    folderId.value = created.id
    newFolderName.value = ''
    showNewFolder.value = false
  } finally {
    creatingFolder.value = false
  }
}

const submit = async () => {
  if (folderId.value == null) {
    ElMessage.warning('请选择收藏夹')
    return
  }
  submitting.value = true
  try {
    await favoriteApi.create({
      folderId: folderId.value,
      targetType: props.targetType,
      targetId: props.targetId,
      note: note.value.trim() || undefined,
    })
    ElMessage.success('已加入收藏')
    visible.value = false
    emit('success')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <el-dialog v-model="visible" title="添加到收藏" width="480px" destroy-on-close>
    <div v-loading="loading">
      <el-form label-width="88px">
        <el-form-item label="收藏夹">
          <el-select v-model="folderId" placeholder="选择收藏夹" style="width: 100%">
            <el-option v-for="f in folders" :key="f.id" :label="f.name" :value="f.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button link type="primary" @click="showNewFolder = !showNewFolder">
            {{ showNewFolder ? '收起' : '新建收藏夹' }}
          </el-button>
        </el-form-item>
        <el-form-item v-if="showNewFolder" label="新夹名称">
          <el-space>
            <el-input v-model="newFolderName" maxlength="64" placeholder="名称" style="width: 220px" />
            <el-button type="primary" :loading="creatingFolder" @click="createFolder">创建</el-button>
          </el-space>
        </el-form-item>
        <el-form-item label="批注">
          <el-input v-model="note" type="textarea" :rows="3" maxlength="2000" show-word-limit placeholder="可选" />
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" :disabled="loading" @click="submit">确定</el-button>
    </template>
  </el-dialog>
</template>
