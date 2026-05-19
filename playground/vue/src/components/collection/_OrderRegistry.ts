import { createOrderRegistry, type OrderRegistryHandler } from '@wrapper-items/lib'
import { inject, onScopeDispose, provide, toValue, watch } from 'vue'
import type { InjectionKey, MaybeRefOrGetter } from 'vue'

interface CollectionOrderContext {
  registerItemOrder(
    id: MaybeRefOrGetter<string | undefined>,
    order: MaybeRefOrGetter<number>,
  ): void
}

const collectionOrderKey: InjectionKey<CollectionOrderContext> =
  Symbol('playground-collection-order')

/**
 * 提供 item 渲染顺序登记能力
 *
 * @description wrapper 根据已登记的 item id 同步 core 顺序
 */
export function provideCollectionOrder(handler: OrderRegistryHandler<string>): void {
  const orderRegistry = createOrderRegistry<string>(handler)

  onScopeDispose(() => {
    orderRegistry.dispose()
  })

  provide(collectionOrderKey, {
    registerItemOrder(id, order) {
      let currentId: string | undefined

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
