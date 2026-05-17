import { assertCollectionItem, assertItemId } from './assertions'
import { normalizeRequestedOrder } from './order'
import { createSnapshot, isSameSnapshot } from './snapshot'
import type {
  CollectionController,
  CollectionItem,
  CollectionItemPatch,
  CollectionItemSnapshot,
  CollectionSnapshot,
  ItemId,
  Listener,
  SubscribeOptions,
  Unsubscribe,
} from './types'

/**
 * 创建 item 集合控制器
 */
export function createCollectionController<
  TItem extends CollectionItem = CollectionItem,
>(): CollectionController<TItem> {
  const items = new Map<ItemId, TItem>()
  const listeners = new Set<Listener<CollectionSnapshot<TItem>>>()
  let explicitOrder: ItemId[] | null = null
  let snapshot = createSnapshot(items, explicitOrder)

  function commit(): void {
    const nextSnapshot = createSnapshot(items, explicitOrder)
    if (isSameSnapshot(snapshot, nextSnapshot)) return

    snapshot = nextSnapshot
    for (const listener of Array.from(listeners)) {
      listener(snapshot)
    }
  }

  function normalizeItemOrId(itemOrId: TItem | ItemId): ItemId {
    return typeof itemOrId === 'string' ? itemOrId : itemOrId.id
  }

  return {
    get size(): number {
      return items.size
    },

    getSnapshot(): CollectionSnapshot<TItem> {
      return snapshot
    },

    getItemSnapshot(id: ItemId): CollectionItemSnapshot<TItem> | undefined {
      assertItemId(id)

      const item = items.get(id)
      if (!item) return undefined

      const index = snapshot.orderedIds.indexOf(id)
      return Object.freeze({
        id,
        item,
        index,
        isFirst: index === 0,
        isLast: index === snapshot.orderedIds.length - 1,
      })
    },

    get(id: ItemId): TItem | undefined {
      assertItemId(id)
      return items.get(id)
    },

    has(id: ItemId): boolean {
      assertItemId(id)
      return items.has(id)
    },

    register(item: TItem): void {
      assertCollectionItem(item)
      items.set(item.id, item)
      commit()
    },

    update(id: ItemId, patch: CollectionItemPatch<TItem>): boolean {
      assertItemId(id)

      const current = items.get(id)
      if (!current) return false

      const nextItem =
        typeof patch === 'function'
          ? patch(current)
          : ({ ...current, ...patch } as TItem)

      assertCollectionItem(nextItem)
      if (nextItem.id !== id) {
        throw new Error('Collection item id cannot be changed during update.')
      }

      items.set(id, nextItem)
      commit()
      return true
    },

    unregister(itemOrId: TItem | ItemId): boolean {
      const id = normalizeItemOrId(itemOrId)
      assertItemId(id)

      const deleted = items.delete(id)
      if (deleted) commit()
      return deleted
    },

    setOrder(ids: readonly ItemId[]): void {
      explicitOrder = normalizeRequestedOrder(ids, items)
      commit()
    },

    clearOrder(): void {
      explicitOrder = null
      commit()
    },

    clear(): void {
      if (items.size === 0 && explicitOrder === null) return

      items.clear()
      explicitOrder = null
      commit()
    },

    subscribe(
      listener: Listener<CollectionSnapshot<TItem>>,
      options: SubscribeOptions = {},
    ): Unsubscribe {
      listeners.add(listener)
      if (options.immediate) listener(snapshot)

      return () => {
        listeners.delete(listener)
      }
    },
  }
}
