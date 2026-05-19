import type { CollectionItem, ItemId } from './item'

/**
 * collection 的只读快照
 *
 * @description orderedIds 与 orderedItems 一一对应
 */
export interface CollectionSnapshot<
  TData,
  TItem extends CollectionItem<TData>,
> {
  /** 按注册顺序排列的 item */
  readonly items: readonly TItem[]

  /** 当前逻辑顺序对应的 id */
  readonly orderedIds: readonly ItemId[]

  /** 当前逻辑顺序对应的 item */
  readonly orderedItems: readonly TItem[]
}

/**
 * 单个 item 在当前顺序中的位置快照
 *
 * @description index 基于 orderedItems 计算
 */
export interface CollectionItemSnapshot<
  TData,
  TItem extends CollectionItem<TData>,
> {
  readonly id: ItemId

  readonly item: TItem

  /** item 在 orderedItems 中的位置 */
  readonly index: number

  /** item 是否位于 orderedItems 首位 */
  readonly isFirst: boolean

  /** item 是否位于 orderedItems 末位 */
  readonly isLast: boolean
}
