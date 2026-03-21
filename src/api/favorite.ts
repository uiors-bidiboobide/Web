import request from '@/utils/request'
import type {
  CreateFavoriteBody,
  FavoriteItemVO,
  FavoriteListQuery,
  PatchFavoriteBody,
} from '@/types/api'

export const favoriteApi = {
  create: (body: CreateFavoriteBody): Promise<FavoriteItemVO> =>
    request.post('/favorites', body),

  update: (id: number, body: PatchFavoriteBody): Promise<FavoriteItemVO> =>
    request.patch(`/favorites/${id}`, body),

  remove: (id: number): Promise<null> => request.delete(`/favorites/${id}`),

  list: (params?: FavoriteListQuery): Promise<FavoriteItemVO[]> =>
    request.get('/favorites', { params }),
}
