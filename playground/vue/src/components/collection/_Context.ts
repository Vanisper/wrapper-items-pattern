import { createCollectionContext } from '@wrapper-items/vue'
import type { CollectionItem } from '@wrapper-items/core';
import type { UseCollectionItemReturn } from '@wrapper-items/vue'
import type { MaybeRefOrGetter } from 'vue'

import { useCollectionOrder } from "./_OrderRegistry";

export const {
  provideCollection,
  useCollection,
  useCollectionItem
} = createCollectionContext({
  missingProviderMessage:
    'Missing playground collection provider. Render items inside ItemsWrapper first.',
})

interface UseCollectionItemOptions<TData, T extends CollectionItem<TData>> {
  readonly item: MaybeRefOrGetter<T>
  readonly order: MaybeRefOrGetter<number>
}

/**
 * 注册 playground item 并同步渲染顺序
 *
 * @description 渲染顺序依赖 itemSnapshot，只有 item 成功进入 collection 后才会登记顺序
 */
export function useOrderedCollectionItem<TData, T extends CollectionItem<TData>>(
  options: UseCollectionItemOptions<TData, T>,
): UseCollectionItemReturn<TData, T> {
  const itemState = useCollectionItem<TData, T>(options)
  const { registerItemOrder } = useCollectionOrder()

  registerItemOrder(
    () => itemState.itemSnapshot.value?.id,
    options.order,
  )

  return itemState
}
