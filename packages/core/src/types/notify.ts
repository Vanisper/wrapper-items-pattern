import type { CollectionChange } from './change'
import type { CollectionItem } from './item'
import type { CollectionSnapshot } from './snapshot'

/**
 * collection 派发给订阅者的通知载荷
 */
export interface CollectionNotify<
  TItem extends CollectionItem = CollectionItem,
> {
  /** 本次通知对应的最新快照 */
  readonly snapshot: CollectionSnapshot<TItem>

  /**
   * 本次通知前的快照
   *
   * @description immediate 通知没有前置变化，因此该值为 null
   */
  readonly previousSnapshot: CollectionSnapshot<TItem> | null

  /**
   * 本次通知包含的状态变化记录
   *
   * @description immediate 通知没有前置变化，因此该值为空数组
   */
  readonly changes: readonly CollectionChange<TItem>[]
}
