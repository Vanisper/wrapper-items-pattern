import {
  createExplicitOrderContext,
  createRenderedOrderContext,
  useExplicitItemOrder,
  useRenderedItemOrder,
} from '@wrapper-items/vue'
import { toValue, watch } from 'vue'
import { useCollectionItem } from './_Context'
import type { CollectionItem } from '@wrapper-items/core'
import type {
  ProvideExplicitOrderOptions,
  UseCollectionItemReturn,
} from '@wrapper-items/vue'
import type { MaybeRefOrGetter } from 'vue'

export type CollectionOrderMode = 'rendered' | 'explicit'

const {
  provideExplicitOrder,
  useExplicitOrder,
} = createExplicitOrderContext({
  missingProviderMessage:
    'Missing playground order provider. Render items inside ItemsWrapper first.',
})

const {
  provideRenderedOrder,
  useRenderedOrder,
} = createRenderedOrderContext({
  missingProviderMessage:
    'Missing playground order provider. Render items inside ItemsWrapper first.',
})

interface UseCollectionItemBaseOptions<TData, T extends CollectionItem<TData>> {
  readonly item: MaybeRefOrGetter<T>
}

interface UseCollectionItemRenderedOptions<
  TData,
  T extends CollectionItem<TData>,
> extends UseCollectionItemBaseOptions<TData, T> {
  readonly orderMode?: MaybeRefOrGetter<'rendered'>
}

interface UseCollectionItemExplicitOptions<
  TData,
  T extends CollectionItem<TData>,
> extends UseCollectionItemBaseOptions<TData, T> {
  readonly orderMode: MaybeRefOrGetter<'explicit'>
  readonly order: MaybeRefOrGetter<number>
}

interface UseCollectionItemDynamicOptions<
  TData,
  T extends CollectionItem<TData>,
> extends UseCollectionItemBaseOptions<TData, T> {
  readonly orderMode: MaybeRefOrGetter<CollectionOrderMode>
  readonly order: MaybeRefOrGetter<number>
}

type UseCollectionItemOptions<TData, T extends CollectionItem<TData>> =
  | UseCollectionItemRenderedOptions<TData, T>
  | UseCollectionItemExplicitOptions<TData, T>
  | UseCollectionItemDynamicOptions<TData, T>

interface ProvideCollectionOrderOptions extends ProvideExplicitOrderOptions {
  readonly mode: MaybeRefOrGetter<CollectionOrderMode>
}

export function provideCollectionOrder(
  handler: (ids: readonly string[]) => void,
  options: ProvideCollectionOrderOptions,
): void {
  const latestIds = new Map<CollectionOrderMode, readonly string[]>()

  function handleOrder(mode: CollectionOrderMode, ids: readonly string[]): void {
    latestIds.set(mode, ids)
    
    if (toValue(options.mode) === mode) {
      handler(ids)
    }
  }

  provideRenderedOrder(
    (ids) => {
      handleOrder('rendered', ids)
    },
    {
      scheduler: options.scheduler,
    },
  )

  provideExplicitOrder(
    (ids) => {
      handleOrder('explicit', ids)
    },
    {
      scheduler: options.scheduler,
    },
  )

  watch(
    () => toValue(options.mode),
    (mode) => {
      const ids = latestIds.get(mode)
      if (ids) {
        handler(ids)
      }
    },
  )
}

/**
 * 注册 playground item 并同步顺序
 *
 * @description 只有 item 成功进入 collection 后才会登记到顺序内核中
 */
export function useOrderedCollectionItem<TData, T extends CollectionItem<TData>>(
  options: UseCollectionItemRenderedOptions<TData, T>,
): UseCollectionItemReturn<TData, T>
export function useOrderedCollectionItem<TData, T extends CollectionItem<TData>>(
  options: UseCollectionItemExplicitOptions<TData, T>,
): UseCollectionItemReturn<TData, T>
export function useOrderedCollectionItem<TData, T extends CollectionItem<TData>>(
  options: UseCollectionItemDynamicOptions<TData, T>,
): UseCollectionItemReturn<TData, T>
export function useOrderedCollectionItem<TData, T extends CollectionItem<TData>>(
  options: UseCollectionItemOptions<TData, T>,
): UseCollectionItemReturn<TData, T> {
  const itemState = useCollectionItem<TData, T>(options)
  const itemId = () => itemState.itemSnapshot.value?.id
  const order = 'order' in options ? options.order : undefined

  useRenderedItemOrder(
    useRenderedOrder(),
    itemId,
  )

  if (order) {
    useExplicitItemOrder(
      useExplicitOrder(),
      itemId,
      order,
    )
  } else {
    watch(
      () => toValue(options.orderMode) ?? 'rendered',
      (mode) => {
        if (mode === 'explicit') {
          throw new Error('Explicit order mode requires item order.')
        }
      },
      { immediate: true },
    )
  }

  return itemState
}
