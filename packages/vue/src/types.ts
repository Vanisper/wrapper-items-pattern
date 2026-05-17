import type {
  CollectionController,
  CollectionItem,
  CollectionItemSnapshot,
  CollectionSnapshot,
} from '@wrapper-items/core'
import type {
  ComputedRef,
  InjectionKey,
  MaybeRefOrGetter,
  ShallowRef,
} from 'vue'

/**
 * Vue collection 上下文
 *
 * @description
 * - controller 暴露 core 控制器，供父级或组合行为执行注册、更新、排序等操作
 * - snapshot 是响应式只读快照，会随 controller 订阅结果更新
 */
export interface CollectionContext<
  TItem extends CollectionItem = CollectionItem,
> {
  readonly controller: CollectionController<TItem>

  readonly snapshot: Readonly<ShallowRef<CollectionSnapshot<TItem>>>
}

/**
 * 创建 Vue collection 上下文时的选项
 */
export interface CreateCollectionContextOptions<
  TItem extends CollectionItem = CollectionItem,
> {
  /**
   * 自定义 inject/provide key
   *
   * @default Symbol('wrapper-items:collection')
   */
  key?: InjectionKey<CollectionContext<TItem>>

  /**
   * 缺少 provider 时的错误信息
   */
  missingProviderMessage?: string
}

/**
 * provide collection 时的选项
 */
export interface ProvideCollectionOptions<
  TItem extends CollectionItem = CollectionItem,
> {
  /**
   * 外部创建的 core controller
   *
   * @default createCollectionController()
   */
  controller?: CollectionController<TItem>
}

/**
 * 使用完整 item 注册单个子项的参数
 */
export interface UseCollectionItemWithItemOptions<
  TItem extends CollectionItem = CollectionItem,
> {
  /**
   * 完整 item
   *
   * @description 适合 item 除 id、data 外还有额外字段的场景
   */
  item: MaybeRefOrGetter<TItem>
}

/**
 * 使用 id/data 注册单个子项的参数
 */
export interface UseCollectionItemWithPartsOptions<
  TItem extends CollectionItem = CollectionItem,
> {
  /**
   * item id
   *
   * @description 支持普通值、ref 或 getter，id 变化时会注销旧 item 并注册新 item
   */
  id: MaybeRefOrGetter<TItem['id']>

  /**
   * item data
   *
   * @description data 作为不透明数据写入 core item
   */
  data?: MaybeRefOrGetter<TItem['data']>
}

/**
 * 单个 item 注册参数
 */
export type UseCollectionItemOptions<
  TItem extends CollectionItem = CollectionItem,
> =
  | UseCollectionItemWithItemOptions<TItem>
  | (Exclude<keyof TItem, keyof CollectionItem> extends never
      ? UseCollectionItemWithPartsOptions<TItem>
      : never)

/**
 * 单个 item 注册后的返回值
 */
export interface UseCollectionItemReturn<
  TItem extends CollectionItem = CollectionItem,
> {
  /** 当前 item 在 collection 中的位置快照 */
  readonly itemSnapshot: ComputedRef<
    CollectionItemSnapshot<TItem> | undefined
  >

  /** 当前 item 在 orderedItems 中的位置 */
  readonly index: ComputedRef<number>

  /** 当前 item 是否位于 orderedItems 首位 */
  readonly isFirst: ComputedRef<boolean>

  /** 当前 item 是否位于 orderedItems 末位 */
  readonly isLast: ComputedRef<boolean>
}

/**
 * 数据驱动 items 同步参数
 */
export interface UseCollectionItemsOptions<
  TItem extends CollectionItem = CollectionItem,
> {
  /**
   * 外部传入的 item 列表
   *
   * @description 列表顺序会同步为 collection 的逻辑顺序
   */
  items: MaybeRefOrGetter<readonly TItem[]>
}

/**
 * 数据驱动 items 同步后的返回值
 */
export interface UseCollectionItemsReturn<
  TItem extends CollectionItem = CollectionItem,
> {
  /** 当前 collection 上下文 */
  readonly context: CollectionContext<TItem>

  /** 响应式只读快照 */
  readonly snapshot: Readonly<ShallowRef<CollectionSnapshot<TItem>>>
}

/**
 * createCollectionContext 返回的工具集合
 */
export interface CollectionContextHelpers<
  TItem extends CollectionItem = CollectionItem,
> {
  readonly key: InjectionKey<CollectionContext<TItem>>

  provideCollection(
    options?: ProvideCollectionOptions<TItem>,
  ): CollectionContext<TItem>

  useCollection(): CollectionContext<TItem>

  useCollectionSnapshot(): Readonly<ShallowRef<CollectionSnapshot<TItem>>>

  useCollectionItem(
    options: UseCollectionItemOptions<TItem>,
  ): UseCollectionItemReturn<TItem>

  useCollectionItems(
    options: UseCollectionItemsOptions<TItem>,
  ): UseCollectionItemsReturn<TItem>
}
