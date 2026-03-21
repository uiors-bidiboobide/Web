import request from '@/utils/request'
import type {
  CreateSubjectForm,
  KnowledgePoint,
  Subject,
  SubjectCreateResult,
} from '@/types/api'

export const subjectApi = {
  create: (form: CreateSubjectForm): Promise<SubjectCreateResult> =>
    request.post('/subject/create', form),
  list: (): Promise<Subject[]> => request.get('/subject/list'),
  getPoints: (subjectId: number): Promise<{ subjectId: number; points: KnowledgePoint[] }> =>
    request.get(`/subject/${subjectId}/points`),
}
