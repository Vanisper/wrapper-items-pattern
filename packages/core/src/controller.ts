import { assertCollectionItem, assertItemId } from './assertions'
import { normalizeRequestedOrder } from './order'
import { createSnapshot, isSameSnapshot } from './snapshot'
import type {
  CollectionChange,
  CollectionController,
  CollectionItem,
  CollectionItemPatch,
  CollectionItemRegisteredChange,
  CollectionItemSnapshot,
  CollectionItemUnregisteredChange,
  CollectionItemUpdatedChange,
  CollectionNotify,
  CollectionOperationType,
  CollectionOrderChangedChange,
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
  TData,
  TItem extends CollectionItem<TData> = CollectionItem<TData>,
>(): CollectionController<TData, TItem> {
  const items = new Map<ItemId, TItem>()
  const listeners = new Set<Listener<CollectionNotify<TData, TItem>>>()
  let explicitOrder: ItemId[] | null = null
  let snapshot = createSnapshot(items, explicitOrder)

  let isNotifying = false
  const pendingNotifies: CollectionNotify<TData, TItem>[] = []

  function commit(
    operation: CollectionOperationType,
    operationChanges: readonly CollectionChange<TData, TItem>[] = [],
  ): void {
    const nextSnapshot = createSnapshot(items, explicitOrder)
    if (isSameSnapshot(snapshot, nextSnapshot)) return

    const previousSnapshot = snapshot
    snapshot = nextSnapshot
    notify(
      createNotify(
        nextSnapshot,
        previousSnapshot,
        operation,
        createChanges(operationChanges, previousSnapshot, nextSnapshot),
      ),
    )
  }

  function createNotify(
    snapshot: CollectionSnapshot<TData, TItem>,
    previousSnapshot: CollectionSnapshot<TData, TItem> | null,
    operation: CollectionOperationType | null,
    changes: readonly CollectionChange<TData, TItem>[],
  ): CollectionNotify<TData, TItem> {
    return Object.freeze({ operation, snapshot, previousSnapshot, changes })
  }

  function createChanges(
    operationChanges: readonly CollectionChange<TData, TItem>[],
    previousSnapshot: CollectionSnapshot<TData, TItem>,
    nextSnapshot: CollectionSnapshot<TData, TItem>,
  ): readonly CollectionChange<TData, TItem>[] {
    const changes = [...operationChanges]

    if (!isSameIds(previousSnapshot.orderedIds, nextSnapshot.orderedIds)) {
      changes.push(
        Object.freeze<CollectionOrderChangedChange>({
          type: 'order:changed',
          orderedIds: nextSnapshot.orderedIds,
          previousOrderedIds: previousSnapshot.orderedIds,
        }),
      )
    }

    return Object.freeze(changes)
  }

  /**
   * 按 snapshot 产生顺序派发订阅通知
   *
   * @description
   * - listener 内部可能再次修改 collection，形成重入通知
   * - 重入时先把新 snapshot 入队，等当前 snapshot 的所有 listener 通知完成后再派发
   * - 这样同一轮通知中的 listener 会看到同一个 snapshot，不会被中途更新污染
   */
  function notify(nextNotify: CollectionNotify<TData, TItem>): void {
    if (isNotifying) {
      pendingNotifies.push(nextNotify)
      return
    }

    isNotifying = true

    try {
      let currentNotify: CollectionNotify<TData, TItem> | undefined = nextNotify

      while (currentNotify) {
        for (const listener of Array.from(listeners)) {
          listener(currentNotify)
        }

        currentNotify = pendingNotifies.shift()
      }
    } finally {
      pendingNotifies.length = 0
      isNotifying = false
    }
  }

  function normalizeItemOrId(itemOrId: TItem | ItemId): ItemId {
    return typeof itemOrId === 'string' ? itemOrId : itemOrId.id
  }

  function isSameIds(left: readonly ItemId[], right: readonly ItemId[]): boolean {
    return (
      left.length === right.length &&
      left.every((id, index) => Object.is(id, right[index]))
    )
  }

  return {
    get size(): number {
      return items.size
    },

    getSnapshot(): CollectionSnapshot<TData, TItem> {
      return snapshot
    },

    getItemSnapshot(id: ItemId): CollectionItemSnapshot<TData, TItem> | undefined {
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

      if (items.has(item.id)) {
        throw new Error(`Collection item id "${item.id}" is already registered.`)
      }

      items.set(item.id, item)
      commit('register', [
        Object.freeze<CollectionItemRegisteredChange<TData, TItem>>({
          type: 'item:registered',
          id: item.id,
          item,
        }),
      ])
    },

    update(id: ItemId, patch: CollectionItemPatch<TData, TItem>): boolean {
      assertItemId(id)

      const current = items.get(id)
      if (!current) return false

      const nextItem =
        typeof patch === 'function'
          ? patch(current)
          : ({ ...current, ...patch })

      assertCollectionItem(nextItem)
      if (nextItem.id !== id) {
        throw new Error('Collection item id cannot be changed during update.')
      }

      items.set(id, nextItem)
      commit('update', [
        Object.freeze<CollectionItemUpdatedChange<TData, TItem>>({
          type: 'item:updated',
          id,
          item: nextItem,
          previousItem: current,
        }),
      ])
      return true
    },

    unregister(itemOrId: TItem | ItemId): boolean {
      const id = normalizeItemOrId(itemOrId)
      assertItemId(id)

      const item = items.get(id)
      if (!item) return false

      items.delete(id)
      commit('unregister', [
        Object.freeze<CollectionItemUnregisteredChange<TData, TItem>>({
          type: 'item:unregistered',
          id,
          item,
        }),
      ])
      return true
    },

    setOrder(ids: readonly ItemId[]): void {
      explicitOrder = normalizeRequestedOrder(ids, items)
      commit('setOrder')
    },

    clearOrder(): void {
      explicitOrder = null
      commit('clearOrder')
    },

    clear(): void {
      if (items.size === 0 && explicitOrder === null) return

      const unregisteredChanges = Array.from(items.values(), (item) =>
        Object.freeze<CollectionChange<TData, TItem>>({
          type: 'item:unregistered',
          id: item.id,
          item,
        }),
      )

      items.clear()
      explicitOrder = null
      commit('clear', unregisteredChanges)
    },

    subscribe(
      listener: Listener<CollectionNotify<TData, TItem>>,
      options: SubscribeOptions = {},
    ): Unsubscribe {
      listeners.add(listener)
      if (options.immediate) {
        listener(createNotify(snapshot, null, null, Object.freeze([])))
      }

      return () => {
        listeners.delete(listener)
      }
    },
  }
}
