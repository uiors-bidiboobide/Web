export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface User {
  userId: number
  username: string
  token: string
}

export interface LoginForm {
  username: string
  password: string
  email?: string
}

export interface Subject {
  id: number
  name: string
  totalDays: number
  progress: string
  status: 0 | 1
}

export interface CreateSubjectForm {
  name: string
  description: string
  startDate: string
  endDate: string
}

export interface SubjectCreateResult {
  subjectId: number
  totalDays: number
  estimatedPoints: number
  status: 'GENERATING' | 'COMPLETED'
}

export interface KnowledgePoint {
  id: number
  name: string
  level: 1 | 2 | 3 | 4 | 5
  description: string
  status: 0 | 1 | 2
  completedToday?: boolean
  isDeferred?: boolean
}

export interface StudyPlan {
  subjectId: number
  planGenerated: boolean
  totalDays: number
  totalPoints: number
}

export interface DailyPlan {
  date: string
  subjectId: number
  isCompleted: 0 | 1
  knowledgePoints: KnowledgePoint[]
}

export interface Question {
  id: number
  knowledgePointId: number
  content: string
  options: Record<string, string>
  userAnswer: string | null
  isCorrect: 0 | 1 | null
  correctAnswer?: string
  explanation?: string
}

export interface TestPaper {
  testId: string
  questions: Question[]
}

export type TestGenerateStatus = 'GENERATING' | 'READY'
export type TestStatus = 'GENERATING' | 'READY' | 'FAILED'

// POST /api/test/generate 返回
export interface TestGenerateResponse {
  testId: string
  status: TestGenerateStatus
}

// GET /api/test/status 返回
export interface TestStatusResponse {
  testId: string
  status: TestStatus
  error?: string
}

// GET /api/test/questions 返回
export interface TestQuestionsResponse {
  testId: string
  status: TestStatus
  questions: Question[]
  error?: string
}

export interface SubmitAnswer {
  questionId: number
  userAnswer: string
}

export interface TestResult {
  score: number
  correctCount: number
  totalCount: number
  isPass: boolean
}

export interface CompleteForm {
  knowledgePointId: number
  subjectId: number
}

export interface DeferForm {
  knowledgePointId: number
  subjectId: number
  fromDate: string
}

export interface StudyStatistics {
  totalPoints: number
  completed: number
  deferred: number
  completionRate: string
}

// -----------------------------
// AI Chat（知识点讲解 / 题目讲解）
// -----------------------------

export type AiChatContextType = 'KNOWLEDGE_POINT' | 'QUESTION'

export interface AiChatStartRequest {
  contextType: AiChatContextType
  contextId: number
}

export interface AiChatStartResponse {
  sessionId: number
  assistantMessage: string
}

export interface AiChatMessageRequest {
  sessionId: number
  userMessage: string
}

export interface AiChatMessageResponse {
  assistantMessage: string
}

export type AiChatRole = 'USER' | 'ASSISTANT'

export interface AiChatHistoryItem {
  id: number
  sessionId: number
  role: AiChatRole
  content: string
  createTime: string
}
