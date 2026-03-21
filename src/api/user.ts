import request from '@/utils/request'
import type { LoginForm, User } from '@/types/api'

export const userApi = {
  register: (form: LoginForm): Promise<User> => request.post('/user/register', form),
  login: (form: Omit<LoginForm, 'email'>): Promise<User> => request.post('/user/login', form),
}
