import request from '@/utils/request'
import type { PostActivityBody, PostStudyDurationBody, ProfileMe } from '@/types/api'

export const profileApi = {
  getMe: (): Promise<ProfileMe> => request.get('/profile/me'),

  postActivity: (body: PostActivityBody): Promise<null> =>
    request.post('/profile/activities', body),

  postStudyDuration: (body: PostStudyDurationBody): Promise<null> =>
    request.post('/profile/study-duration', body),
}
