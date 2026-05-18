import type { CollectionItem, ItemId } from './item'

/**
 * collection 状态变化记录
 *
 * @description 描述本次通知中已经提交的 collection/order 事实，不用于派发自定义事件
 */
export type CollectionChange<
  TItem extends CollectionItem = CollectionItem,
> =
  | CollectionItemRegisteredChange<TItem>
  | CollectionItemUpdatedChange<TItem>
  | CollectionItemUnregisteredChange<TItem>
  | CollectionOrderChangedChange

/**
 * item 注册完成后的变化记录
 */
export interface CollectionItemRegisteredChange<
  TItem extends CollectionItem = CollectionItem,
> {
  /** 变化类型 */
  readonly type: 'item:registered'

  /** 已注册 item 的 id */
  readonly id: ItemId

  /** 已注册 item */
  readonly item: TItem
}

/**
 * item 更新完成后的变化记录
 */
export interface CollectionItemUpdatedChange<
  TItem extends CollectionItem = CollectionItem,
> {
  /** 变化类型 */
  readonly type: 'item:updated'

  /** 已更新 item 的 id */
  readonly id: ItemId

  /** 更新后的 item */
  readonly item: TItem

  /** 更新前的 item */
  readonly previousItem: TItem
}

/**
 * item 注销完成后的变化记录
 */
export interface CollectionItemUnregisteredChange<
  TItem extends CollectionItem = CollectionItem,
> {
  /** 变化类型 */
  readonly type: 'item:unregistered'

  /** 已注销 item 的 id */
  readonly id: ItemId

  /** 已注销 item */
  readonly item: TItem
}

/**
 * 逻辑顺序变化完成后的变化记录
 */
export interface CollectionOrderChangedChange {
  /** 变化类型 */
  readonly type: 'order:changed'

  /** 变化后的逻辑顺序 */
  readonly orderedIds: readonly ItemId[]

  /** 变化前的逻辑顺序 */
  readonly previousOrderedIds: readonly ItemId[]
}
