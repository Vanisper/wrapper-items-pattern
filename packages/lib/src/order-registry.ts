/**
 * 接收排序后的 id 列表
 */
export type OrderRegistryHandler<TId extends string = string> = (
  orderedIds: readonly TId[],
) => void

/**
 * 调度顺序同步任务
 *
 * @description 默认使用 queueMicrotask 合并同一轮同步登记
 */
export type OrderRegistryScheduler = (flush: () => void) => void

/**
 * 创建 order registry 时的选项
 */
export interface OrderRegistryOptions {
  /**
   * 自定义调度器
   *
   * @default queueMicrotask
   */
  scheduler?: OrderRegistryScheduler
}

/**
 * 根据登记信息产出 orderedIds 的 registry
 *
 * @description
 * - registry 只维护 id 与 order 的映射
 * - handler 负责消费排序后的 orderedIds
 */
export interface OrderRegistry<TId extends string = string> {
  /** 当前已登记 id 数量 */
  readonly size: number

  /** 判断 id 是否已经登记 */
  has(id: TId): boolean

  /** 读取 id 对应的 order */
  get(id: TId): number | undefined

  /** 读取当前登记信息对应的 orderedIds */
  getOrderedIds(): readonly TId[]

  /**
   * 登记或更新 id 对应的 order
   *
   * @description order 变化后会请求同步 orderedIds
   */
  set(id: TId, order: number): void

  /**
   * 删除 id 对应的登记信息
   *
   * @description 找不到目标 id 时返回 false
   */
  delete(id: TId): boolean

  /**
   * 清空所有登记信息
   */
  clear(): void

  /**
   * 立即执行已请求的同步任务
   *
   * @description 没有待同步任务时返回 false
   */
  flush(): boolean

  /**
   * 停止后续同步
   */
  dispose(): void
}

/**
 * 创建 order registry
 *
 * @description handler 只会在 orderedIds 相对上次同步结果实际变化时调用
 */
export function createOrderRegistry<TId extends string = string>(
  handler: OrderRegistryHandler<TId>,
  options: OrderRegistryOptions = {},
): OrderRegistry<TId> {
  const scheduler = options.scheduler ?? queueMicrotask
  const itemOrders = new Map<TId, number>()
  let pending = false
  let disposed = false
  let lastOrderedIds: readonly TId[] = Object.freeze([])

  function getOrderedIds(): readonly TId[] {
    return Object.freeze(
      Array.from(itemOrders)
        .sort(([, previous], [, next]) => previous - next)
        .map(([id]) => id),
    )
  }

  function requestSync(): void {
    if (pending || disposed) return

    pending = true
    scheduler(() => {
      flush()
    })
  }

  function flush(): boolean {
    if (!pending || disposed) return false

    pending = false
    const orderedIds = getOrderedIds()
    if (isSameIds(lastOrderedIds, orderedIds)) return false

    lastOrderedIds = orderedIds
    handler(orderedIds)
    return true
  }

  return {
    get size(): number {
      return itemOrders.size
    },

    has(id: TId): boolean {
      assertOrderRegistryId(id)
      return itemOrders.has(id)
    },

    get(id: TId): number | undefined {
      assertOrderRegistryId(id)
      return itemOrders.get(id)
    },

    getOrderedIds,

    set(id: TId, order: number): void {
      assertOrderRegistryId(id)
      assertOrderRegistryOrder(order)

      const previousOrder = itemOrders.get(id)
      if (previousOrder === order) return

      itemOrders.set(id, order)
      requestSync()
    },

    delete(id: TId): boolean {
      assertOrderRegistryId(id)

      const deleted = itemOrders.delete(id)
      if (deleted) requestSync()
      return deleted
    },

    clear(): void {
      if (itemOrders.size === 0) return

      itemOrders.clear()
      requestSync()
    },

    flush,

    dispose(): void {
      disposed = true
      pending = false
    },
  }
}

function assertOrderRegistryId(id: string): void {
  if (typeof id !== 'string' || id.length === 0) {
    throw new TypeError('Order registry id must be a non-empty string.')
  }
}

function assertOrderRegistryOrder(order: number): void {
  if (typeof order !== 'number' || !Number.isFinite(order)) {
    throw new TypeError('Order registry order must be a finite number.')
  }
}

function isSameIds<TId extends string>(
  left: readonly TId[],
  right: readonly TId[],
): boolean {
  return (
    left.length === right.length &&
    left.every((id, index) => Object.is(id, right[index]))
  )
}
