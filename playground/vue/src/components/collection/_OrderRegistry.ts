import {
  createOrderRegistry,
  type OrderRegistryHandler,
  type OrderRegistryScheduler,
} from '@wrapper-items/lib'
import { inject, onScopeDispose, provide, toValue, watch } from 'vue'
import type { InjectionKey, MaybeRefOrGetter } from 'vue'

interface CollectionOrderContext {
  /**
   * 登记 item id 与渲染顺序的对应关系
   *
   * @description id 为空时暂不进入排序队列
   */
  registerItemOrder(
    id: MaybeRefOrGetter<string | undefined>,
    order: MaybeRefOrGetter<number>,
  ): void
}

/**
 * 提供 order registry 的调度配置
 */
interface ProvideCollectionOrderOptions {
  /**
   * 控制登记变化何时同步给 handler
   *
   * @description 可用于保留 item 注册和顺序修正之间的观察窗口
   */
  readonly scheduler?: OrderRegistryScheduler
}

const collectionOrderKey: InjectionKey<CollectionOrderContext> =
  Symbol('playground-collection-order')

/**
 * 提供 item 渲染顺序登记能力
 *
 * @description
 * - wrapper 根据已登记的 item id 同步 core 顺序
 * - 调度器只影响同步时机，不改变最终排序规则
 */
export function provideCollectionOrder(
  handler: OrderRegistryHandler<string>,
  options: ProvideCollectionOrderOptions = {},
): void {
  const orderRegistry = createOrderRegistry<string>(handler, {
    scheduler: options.scheduler,
  })

  onScopeDispose(() => {
    orderRegistry.dispose()
  })

  provide(collectionOrderKey, {
    registerItemOrder(id, order) {
      let currentId: string | undefined

      // id 来自 collection itemSnapshot，只有 item 成功注册后才进入排序队列
      watch(
        [() => toValue(id), () => toValue(order)],
        ([nextId, nextOrder]) => {
          if (currentId && currentId !== nextId) {
            orderRegistry.delete(currentId)
            currentId = undefined
          }

          if (nextId) {
            currentId = nextId
            orderRegistry.set(nextId, nextOrder)
          }
        },
        { immediate: true },
      )

      onScopeDispose(() => {
        if (currentId) {
          orderRegistry.delete(currentId)
        }
      })
    },
  })
}

export function useCollectionOrder(): CollectionOrderContext {
  const context = inject(collectionOrderKey, null)
  if (!context) {
    throw new Error(
      'Missing collection order provider. Render items inside ItemsWrapper first.',
    )
  }

  return context
}
