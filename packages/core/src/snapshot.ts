import { normalizeOrder } from './order'
import type { CollectionItem, CollectionSnapshot, ItemId } from './types'

export function createSnapshot<TData, TItem extends CollectionItem<TData>>(
  items: ReadonlyMap<ItemId, TItem>,
  explicitOrder: readonly ItemId[] | null,
): CollectionSnapshot<TData, TItem> {
  const orderedIds = normalizeOrder(items, explicitOrder)
  const orderedItems = orderedIds.map((id) => items.get(id)!)

  return Object.freeze({
    items: Object.freeze(Array.from(items.values())),
    orderedIds: Object.freeze(orderedIds),
    orderedItems: Object.freeze(orderedItems),
  })
}

export function isSameSnapshot<TData, TItem extends CollectionItem<TData>>(
  left: CollectionSnapshot<TData, TItem>,
  right: CollectionSnapshot<TData, TItem>,
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
