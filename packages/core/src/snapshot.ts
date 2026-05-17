import { normalizeOrder } from './order'
import type { CollectionItem, CollectionSnapshot, ItemId } from './types'

export function createSnapshot<TItem extends CollectionItem>(
  items: ReadonlyMap<ItemId, TItem>,
  explicitOrder: readonly ItemId[] | null,
): CollectionSnapshot<TItem> {
  const orderedIds = normalizeOrder(items, explicitOrder)
  const orderedItems = orderedIds.map((id) => items.get(id)!)

  return Object.freeze({
    items: Object.freeze(Array.from(items.values())),
    orderedIds: Object.freeze(orderedIds),
    orderedItems: Object.freeze(orderedItems),
  })
}

export function isSameSnapshot<TItem extends CollectionItem>(
  left: CollectionSnapshot<TItem>,
  right: CollectionSnapshot<TItem>,
): boolean {
  return (
    isSameArray(left.items, right.items) &&
    isSameArray(left.orderedIds, right.orderedIds) &&
    isSameArray(left.orderedItems, right.orderedItems)
  )
}

function isSameArray<TValue>(
  left: readonly TValue[],
  right: readonly TValue[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => Object.is(value, right[index]))
  )
}
