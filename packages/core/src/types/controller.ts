import type { CollectionItem, ItemId } from './item'
import type { Listener, SubscribeOptions, Unsubscribe } from './listener'
import type { CollectionNotify } from './notify'
import type { CollectionItemSnapshot, CollectionSnapshot } from './snapshot'

/**
 * item 更新参数
 *
 * @description
 * - 对象形式会浅合并到当前 item
 * - callback 形式可自行实现全量更新
 */
export type CollectionItemPatch<
  TData,
  TItem extends CollectionItem<TData>
> =
  | Partial<TItem>
  | ((item: TItem) => TItem)

/** 管理 item 集合与顺序的控制器 */
export interface CollectionController<
  TData,
  TItem extends CollectionItem<TData>,
> {
  /** 当前已注册 item 数量 */
  readonly size: number

  /** 读取当前 collection 快照 */
  getSnapshot(): CollectionSnapshot<TData, TItem>

  /** 读取单个 item 在当前顺序中的位置快照 */
  getItemSnapshot(id: ItemId): CollectionItemSnapshot<TData, TItem> | undefined

  /** 按 id 读取已注册 item */
  get(id: ItemId): TItem | undefined

  /** 判断 id 是否已经注册 */
  has(id: ItemId): boolean

  /**
   * 注册新的 item
   *
   * @description
   * - id 已存在时会抛出错误
   * - 如需修改已注册 item 应该使用 update
   */
  register(item: TItem): void

  /**
   * 更新已注册 item
   *
   * @description
   * - 找不到目标 id 时返回 false
   * - callback 形式可自行实现全量更新
   * - 更新结果必须保留原 id
   */
  update(id: ItemId, patch: CollectionItemPatch<TData, TItem>): boolean

  /**
   * 注销 item
   *
   * @description 找不到目标时返回 false
   */
  unregister(itemOrId: TItem | ItemId): boolean

  /**
   * 根据传入的 id 列表调整顺序
   *
   * @description
   * - 只会采纳已注册 id
   * - 重复 id 会被忽略
   * - 未传入的已注册 item 会保留在末尾
   */
  setOrder(ids: readonly ItemId[]): void

  /**
   * 清除传入顺序
   *
   * @description orderedItems 会恢复为注册顺序
   */
  clearOrder(): void

  /**
   * 清空所有 item
   *
   * @description 同时清除传入顺序
   */
  clear(): void

  /**
   * 订阅 collection 快照变化
   *
   * @description
   * - 只有 snapshot 内容实际变化时才会触发 listener
   * - 返回函数用于取消订阅
   */
  subscribe(
    listener: Listener<CollectionNotify<TData, TItem>>,
    options?: SubscribeOptions,
  ): Unsubscribe
}
