import type { AxiosPromise } from 'axios'
import BaseRepository from '@/domain/base/BaseRepository'
import ListingModel from '@/domain/listing/ListingModel'
import type ListingFindAllResInterface from '@/domain/listing/types/res/ListingFindAllResInterface'
import type ListingFindOneResInterface from '@/domain/listing/types/res/ListingFindOneResInterface'

export default class ListingRepository extends BaseRepository {
  protected _model = new ListingModel()

  findAll(): AxiosPromise<ListingFindAllResInterface> {
    return this._httpClient.getBackClient().get(`/${this._model.name}/admin`)
  }

  findOne(id: string): AxiosPromise<ListingFindOneResInterface> {
    return this._httpClient.getBackClient().get(`/${this._model.name}/${id}`)
  }

  findCategories(): AxiosPromise {
    return this._httpClient.getBackClient().get('/categories')
  }

  create(payload: Record<string, unknown>): AxiosPromise {
    return this._httpClient.getBackClient().post(`/${this._model.name}`, payload)
  }

  addImage(
    listingId: string,
    image: File,
    options: { isCover: boolean; position: number },
  ): AxiosPromise {
    const formData = new FormData()
    formData.append('image', image)
    formData.append('isCover', String(options.isCover))
    formData.append('position', String(options.position))

    return this._httpClient
      .getBackClient()
      .post(`/${this._model.name}/${listingId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
  }

  delete(id: string): AxiosPromise {
    return this._httpClient.getBackClient().delete(`/${this._model.name}/${id}`)
  }
}
