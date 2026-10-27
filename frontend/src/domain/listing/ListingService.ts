import type { AxiosPromise } from 'axios'

import ListingRepository from '@/domain/listing/ListingRepository'
import type ListingFindAllResInterface from '@/domain/listing/types/res/ListingFindAllResInterface'
import type ListingFindOneResInterface from '@/domain/listing/types/res/ListingFindOneResInterface'

export default class ListingService {
  constructor(private _repository: ListingRepository = new ListingRepository()) {}

  findAll(): AxiosPromise<ListingFindAllResInterface> {
    return this._repository.findAll()
  }

  findOne(id: string): AxiosPromise<ListingFindOneResInterface> {
    return this._repository.findOne(id)
  }

  findCategories(): AxiosPromise {
    return this._repository.findCategories()
  }

  create(payload: Record<string, unknown>): AxiosPromise {
    return this._repository.create(payload)
  }

  addImage(
    listingId: string,
    image: File,
    options: { isCover: boolean; position: number },
  ): AxiosPromise {
    return this._repository.addImage(listingId, image, options)
  }

  delete(id: string): AxiosPromise {
    return this._repository.delete(id)
  }
}
