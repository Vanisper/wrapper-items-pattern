import type { CollectionChange } from './change'
import type { CollectionItem } from './item'
import type { CollectionOperationType } from './operation'
import type { CollectionSnapshot } from './snapshot'

/**
 * collection snapshot 变化通知
 *
 * @description operation 描述变化来源，changes 描述提交后的最小状态事实
 */
export interface CollectionNotify<TData, TItem extends CollectionItem<TData>> {
  /**
   * 本次 snapshot 变化对应的操作来源
   *
   * @description immediate 通知不是由 snapshot 变化触发，因此该值为 null
   */
  readonly operation: CollectionOperationType | null

  /** 本次通知对应的最新快照 */
  readonly snapshot: CollectionSnapshot<TData, TItem>

  /**
   * 本次通知前的快照
   *
   * @description immediate 通知没有前置变化，因此该值为 null
   */
  readonly previousSnapshot: CollectionSnapshot<TData, TItem> | null

  /**
   * 本次通知包含的状态变化记录
   *
   * @description immediate 通知没有前置变化，因此该值为空数组
   */
  readonly changes: readonly CollectionChange<TData, TItem>[]
}
