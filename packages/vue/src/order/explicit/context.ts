import { createOrderRegistry } from '@wrapper-items/lib'
import { inject, onScopeDispose, provide, toValue, watch } from 'vue'
import type { InjectionKey, MaybeRefOrGetter } from 'vue'
import type { OrderRegistryScheduler } from '@wrapper-items/lib'
import type {
  CreateExplicitOrderContextOptions,
  ExplicitOrderContext,
  ExplicitOrderContextHelpers,
  ProvideExplicitOrderOptions,
} from './types'

/**
 * 创建显式顺序上下文
 *
 * @description 适合子项能从组件层拿到稳定 order 的 wrapper/items 场景
 */
export function createExplicitOrderContext<
  TId extends string = string,
>(
  options: CreateExplicitOrderContextOptions<TId> = {},
): ExplicitOrderContextHelpers<TId> {
  const key =
    options.key ?? (Symbol('wrapper-items:explicit-order') as InjectionKey<
      ExplicitOrderContext<TId>
    >)
  const missingProviderMessage =
    options.missingProviderMessage ??
    'Missing explicit order provider. Call provideExplicitOrder() in an ancestor setup scope first.'

  function provideExplicitOrder(
    handler: (orderedIds: readonly TId[]) => void,
    options: ProvideExplicitOrderOptions = {},
  ): ExplicitOrderContext<TId> {
    const orderRegistry = createOrderRegistry<TId>(handler, {
      scheduler: options.scheduler,
    })

    onScopeDispose(() => {
      orderRegistry.dispose()
    })

    const context: ExplicitOrderContext<TId> = {
      registerItemOrder(id, order) {
        let currentId: TId | undefined

        // id 通常来自 itemSnapshot，只有 item 成功注册后才进入排序队列
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
    }

    provide(key, context)
    return context
  }

  function useExplicitOrder(): ExplicitOrderContext<TId> {
    const context = inject(key, null)
    if (!context) throw new Error(missingProviderMessage)
    return context
  }

  return {
    key,
    provideExplicitOrder,
    useExplicitOrder,
  }
}

/**
 * 创建延迟同步调度器
 *
 * @description delay 小于等于 0 时保持 queueMicrotask 的默认批处理语义
 */
export function createDelayedOrderScheduler(
  delay: number,
): OrderRegistryScheduler {
  if (delay <= 0) return queueMicrotask

  return (flush) => {
    globalThis.setTimeout(flush, delay)
  }
}

/**
 * 登记 item 的显式顺序
 */
export function useExplicitItemOrder<TId extends string>(
  context: ExplicitOrderContext<TId>,
  id: MaybeRefOrGetter<TId | undefined>,
  order: MaybeRefOrGetter<number>,
): void {
  context.registerItemOrder(id, order)
}
