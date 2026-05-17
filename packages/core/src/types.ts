/** item 的唯一标识 */
export type ItemId = string

/**
 * collection 中的最小 item 结构
 *
 * @description data 会作为不透明数据随 item 保留在 snapshot 中
 */
export interface CollectionItem<TData = unknown> {
  /** 用作 item 身份的稳定 id */
  id: ItemId

  /** 业务侧附加数据 */
  data?: TData
}

/**
 * collection 的只读快照
 *
 * @description
 * - items 保留注册顺序
 * - orderedItems 表示当前逻辑顺序
 * - orderedIds 与 orderedItems 一一对应
 */
export interface CollectionSnapshot<
  TItem extends CollectionItem = CollectionItem,
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
  TItem extends CollectionItem = CollectionItem,
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

/** 订阅回调 */
export type Listener<TValue> = (value: TValue) => void

/** 取消订阅函数 */
export type Unsubscribe = () => void

/** 订阅选项 */
export interface SubscribeOptions {
  /** 订阅后是否立即收到当前快照 */
  immediate?: boolean
}

/**
 * item 更新参数
 *
 * @description
 * - 对象形式会浅合并到当前 item
 * - 函数形式接收当前 item，并返回完整的新 item
 */
export type CollectionItemPatch<TItem extends CollectionItem> =
  | Partial<TItem>
  | ((item: TItem) => TItem)

/** 管理 item 集合与顺序的控制器 */
export interface CollectionController<
  TItem extends CollectionItem = CollectionItem,
> {
  /** 当前已注册 item 数量 */
  readonly size: number

  /** 读取当前 collection 快照 */
  getSnapshot(): CollectionSnapshot<TItem>

  /** 读取单个 item 在当前顺序中的位置快照 */
  getItemSnapshot(id: ItemId): CollectionItemSnapshot<TItem> | undefined

  /** 按 id 读取已注册 item */
  get(id: ItemId): TItem | undefined

  /** 判断 id 是否已经注册 */
  has(id: ItemId): boolean

  /**
   * 注册 item
   *
   * @description 如果 id 已存在，会替换原 item，并保留它在当前顺序中的位置
   */
  register(item: TItem): void

  /**
   * 更新已注册 item
   *
   * @description
   * - 找不到目标 id 时返回 false
   * - 更新结果必须保留原 id
   */
  update(id: ItemId, patch: CollectionItemPatch<TItem>): boolean

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
   * 清除手动设置的顺序
   *
   * @description orderedItems 会恢复为注册顺序
   */
  clearOrder(): void

  /**
   * 清空所有 item
   *
   * @description 同时清除手动设置的顺序
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
    listener: Listener<CollectionSnapshot<TItem>>,
    options?: SubscribeOptions,
  ): Unsubscribe
}
