import request from '@/utils/request'
import type {
  SubmitAnswer,
  TestGenerateResponse,
  TestQuestionsResponse,
  TestResult,
  TestStatusResponse,
} from '@/types/api'

export const testApi = {
  generate: (subjectId: number, date: string): Promise<TestGenerateResponse> =>
    request.post('/test/generate', { subjectId, date }),
  getStatus: (subjectId: number, date: string): Promise<TestStatusResponse> =>
    request.get('/test/status', { params: { subjectId, date } }),
  getQuestions: (subjectId: number, date: string): Promise<TestQuestionsResponse> =>
    request.get('/test/questions', { params: { subjectId, date } }),
  submit: (subjectId: number, date: string, answers: SubmitAnswer[]): Promise<TestResult> =>
    request.post('/test/submit', { subjectId, date, answers }),
}
