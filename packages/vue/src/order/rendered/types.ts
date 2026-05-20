import type {
  ComponentInternalInstance,
  InjectionKey,
  MaybeRefOrGetter,
  VNode,
} from 'vue'
import type { OrderRegistryScheduler } from '@wrapper-items/lib'

/**
 * 接收从 Vue 渲染结构中还原出的 id 列表
 */
export type RenderedOrderHandler<TId extends string = string> = (
  orderedIds: readonly TId[],
) => void

/**
 * 渲染顺序上下文
 *
 * @description 子项登记自身组件实例和当前 id，父级根据渲染子树中实例出现的位置产出顺序
 */
export interface RenderedOrderContext<TId extends string = string> {
  /**
   * 登记 item id 与当前 Vue 组件实例的对应关系
   *
   * @description id 为空时暂不进入渲染顺序队列
   */
  registerItemOrder(
    id: MaybeRefOrGetter<TId | undefined>,
    instance?: ComponentInternalInstance | null,
  ): void

  /**
   * 请求同步渲染顺序
   */
  requestSync(): void

  /**
   * 立即执行已请求的同步任务
   *
   * @description 没有待同步任务时返回 false
   */
  flush(): boolean
}

/**
 * 创建渲染顺序上下文时的选项
 */
export interface CreateRenderedOrderContextOptions<
  TId extends string = string,
> {
  /**
   * 自定义 inject/provide key
   *
   * @default Symbol('wrapper-items:rendered-order')
   */
  key?: InjectionKey<RenderedOrderContext<TId>>

  /**
   * 缺少 provider 时的错误信息
   */
  missingProviderMessage?: string
}

/**
 * provide 渲染顺序上下文时的选项
 */
export interface ProvideRenderedOrderOptions {
  /**
   * 指定被扫描的父级实例
   *
   * @default getCurrentInstance()
   */
  instance?: ComponentInternalInstance

  /**
   * 自定义扫描起点
   *
   * @default () => instance.subTree
   */
  source?: MaybeRefOrGetter<VNode | readonly unknown[] | undefined | null>

  /**
   * 控制渲染顺序何时同步给 handler
   *
   * @description 可用于观察子项注册和顺序修正之间的过渡状态
   */
  scheduler?: OrderRegistryScheduler
}

/**
 * 渲染顺序上下文工具集合
 */
export interface RenderedOrderContextHelpers<TId extends string = string> {
  readonly key: InjectionKey<RenderedOrderContext<TId>>

  provideRenderedOrder(
    handler: RenderedOrderHandler<TId>,
    options?: ProvideRenderedOrderOptions,
  ): RenderedOrderContext<TId>

  useRenderedOrder(): RenderedOrderContext<TId>
}
