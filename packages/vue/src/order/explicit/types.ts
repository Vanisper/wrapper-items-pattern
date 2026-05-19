import type { OrderRegistryScheduler } from '@wrapper-items/lib'
import type { InjectionKey, MaybeRefOrGetter } from 'vue'

/**
 * 显式顺序上下文
 *
 * @description 子项将自身 id 和外部声明顺序登记到同一个顺序队列中
 */
export interface ExplicitOrderContext<TId extends string = string> {
  /**
   * 登记 item id 与外部声明顺序的对应关系
   *
   * @description id 为空时暂不进入排序队列
   */
  registerItemOrder(
    id: MaybeRefOrGetter<TId | undefined>,
    order: MaybeRefOrGetter<number>,
  ): void
}

/**
 * 创建显式顺序上下文时的选项
 */
export interface CreateExplicitOrderContextOptions<
  TId extends string = string,
> {
  /**
   * 自定义 inject/provide key
   *
   * @default Symbol('wrapper-items:explicit-order')
   */
  key?: InjectionKey<ExplicitOrderContext<TId>>

  /**
   * 缺少 provider 时的错误信息
   */
  missingProviderMessage?: string
}

/**
 * provide 显式顺序上下文时的选项
 */
export interface ProvideExplicitOrderOptions {
  /**
   * 控制登记变化何时同步给 handler
   *
   * @description 可用于保留 item 注册和顺序修正之间的观察窗口
   */
  scheduler?: OrderRegistryScheduler
}

/**
 * 显式顺序上下文工具集合
 */
export interface ExplicitOrderContextHelpers<TId extends string = string> {
  readonly key: InjectionKey<ExplicitOrderContext<TId>>

  provideExplicitOrder(
    handler: (orderedIds: readonly TId[]) => void,
    options?: ProvideExplicitOrderOptions,
  ): ExplicitOrderContext<TId>

  useExplicitOrder(): ExplicitOrderContext<TId>
}
