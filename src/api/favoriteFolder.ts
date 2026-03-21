import request from '@/utils/request'
import type {
  CreateFavoriteFolderBody,
  FavoriteFolder,
  RenameFavoriteFolderBody,
} from '@/types/api'

export const favoriteFolderApi = {
  create: (body: CreateFavoriteFolderBody): Promise<FavoriteFolder> =>
    request.post('/favorite-folders', body),

  list: (): Promise<FavoriteFolder[]> => request.get('/favorite-folders'),

  rename: (id: number, body: RenameFavoriteFolderBody): Promise<null> =>
    request.patch(`/favorite-folders/${id}`, body),

  remove: (id: number): Promise<null> => request.delete(`/favorite-folders/${id}`),
}
