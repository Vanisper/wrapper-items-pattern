import { assertItemId } from './assertions'
import type { CollectionItem, ItemId } from './types'

export function normalizeOrder<TItem extends CollectionItem>(
  items: ReadonlyMap<ItemId, TItem>,
  explicitOrder: readonly ItemId[] | null,
): ItemId[] {
  const orderedIds: ItemId[] = []
  const seen = new Set<ItemId>()

  if (explicitOrder) {
    for (const id of explicitOrder) {
      if (items.has(id) && !seen.has(id)) {
        orderedIds.push(id)
        seen.add(id)
      }
    }
  }

  for (const id of items.keys()) {
    if (!seen.has(id)) {
      orderedIds.push(id)
      seen.add(id)
    }
  }

  return orderedIds
}

/**
 * 归一化传入顺序
 *
 * @description 保存前先裁剪掉未知 id 和重复 id，避免后续 snapshot 反复处理无效输入
 */
export function normalizeRequestedOrder<TItem extends CollectionItem>(
  ids: readonly ItemId[],
  items: ReadonlyMap<ItemId, TItem>,
): ItemId[] {
  const normalized: ItemId[] = []
  const seen = new Set<ItemId>()

  for (const id of ids) {
    assertItemId(id)
    if (items.has(id) && !seen.has(id)) {
      normalized.push(id)
      seen.add(id)
    }
  }

  return normalized
}
