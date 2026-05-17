import type { CollectionItem, ItemId } from './types'

export function assertCollectionItem(item: CollectionItem): void {
  if (!item || typeof item !== 'object') {
    throw new TypeError('Collection item must be an object.')
  }

  assertItemId(item.id)
}

export function assertItemId(id: ItemId): void {
  if (typeof id !== 'string' || id.length === 0) {
    throw new TypeError('Collection item id must be a non-empty string.')
  }
}
