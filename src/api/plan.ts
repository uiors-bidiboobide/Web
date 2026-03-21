import request from '@/utils/request'
import type { DailyPlan, StudyPlan } from '@/types/api'

export const planApi = {
  generate: (subjectId: number): Promise<StudyPlan> => request.get(`/plan/${subjectId}/generate`),
  getDaily: (subjectId: number, date: string): Promise<DailyPlan> =>
    request.get(`/plan/${subjectId}/daily/${date}`),
}
