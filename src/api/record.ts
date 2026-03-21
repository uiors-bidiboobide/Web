import request from '@/utils/request'
import type { CompleteForm, DeferForm, StudyStatistics } from '@/types/api'

export const recordApi = {
  complete: (form: CompleteForm): Promise<void> => request.post('/record/complete', form),
  defer: (form: DeferForm): Promise<{ message: string; newDate: string }> =>
    request.post('/record/defer', form),
  getStatistics: (subjectId?: number): Promise<StudyStatistics> =>
    request.get('/record/list', { params: subjectId ? { subjectId } : {} }),
}
