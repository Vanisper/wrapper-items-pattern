import {
  computed,
  inject,
  onScopeDispose,
  provide,
  readonly,
  shallowRef,
  toValue,
  watch,
} from 'vue'
import { createCollectionController } from '@wrapper-items/core'
import type {
  CollectionItem,
  CollectionItemSnapshot,
  CollectionSnapshot,
  ItemId,
} from '@wrapper-items/core'
import type { InjectionKey } from 'vue'
import type {
  CollectionContext,
  CollectionContextHelpers,
  CreateCollectionContextOptions,
  ProvideCollectionOptions,
  UseCollectionItemOptions,
  UseCollectionItemReturn,
  UseCollectionItemsOptions,
  UseCollectionItemsReturn,
} from './types'

/**
 * 创建类型安全的 Vue collection 上下文
 *
 * @description 每种 item 类型可创建独立 context，避免不同组件树之间误用同一个 inject key
 */
export function createCollectionContext<
  TItem extends CollectionItem = CollectionItem,
>(
  options: CreateCollectionContextOptions<TItem> = {},
): CollectionContextHelpers<TItem> {
  const itemOwners = new WeakMap<CollectionContext<TItem>, Map<ItemId, symbol>>()
  const key =
    options.key ?? (Symbol('wrapper-items:collection') as InjectionKey<
      CollectionContext<TItem>
    >)
  const missingProviderMessage =
    options.missingProviderMessage ??
    'Missing collection provider. Call provideCollection() in an ancestor setup scope first.'

  function provideCollection(
    options: ProvideCollectionOptions<TItem> = {},
  ): CollectionContext<TItem> {
    const controller = options.controller ?? createCollectionController<TItem>()
    const snapshot = shallowRef(controller.getSnapshot())

    const unsubscribe = controller.subscribe((nextSnapshot) => {
      snapshot.value = nextSnapshot
    })

    onScopeDispose(unsubscribe)

    const context: CollectionContext<TItem> = {
      controller,
      snapshot: readonly(snapshot) as CollectionContext<TItem>['snapshot'],
    }

    itemOwners.set(context, new Map())

    provide(key, context)
    return context
  }

  function useCollection(): CollectionContext<TItem> {
    const context = inject(key, null)
    if (!context) throw new Error(missingProviderMessage)
    return context
  }

  function useCollectionItem(
    options: UseCollectionItemOptions<TItem>,
  ): UseCollectionItemReturn<TItem> {
    const context = useCollection()
    const { controller, snapshot } = context
    const owners = getItemOwners(itemOwners, context)
    const owner = Symbol('wrapper-items:item-owner')
    const currentId = shallowRef<ItemId>()

    // core 约束 item id 稳定，id 变化时需要注销旧项后重新注册
    watch(
      () => resolveItem(options),
      (item) => {
        const previousId = currentId.value

        assertAvailableItemId(
          owners,
          controller.has(item.id),
          item.id,
          owner,
          previousId,
        )

        if (previousId && previousId !== item.id) {
          releaseItemId(owners, previousId, owner)
          controller.unregister(previousId)
        }

        controller.register(item)
        owners.set(item.id, owner)
        currentId.value = item.id
      },
      { deep: true, immediate: true },
    )

    onScopeDispose(() => {
      if (currentId.value) {
        releaseItemId(owners, currentId.value, owner)
        controller.unregister(currentId.value)
      }
    })

    const itemSnapshot = computed(() => {
      const id = currentId.value
      return id ? getItemSnapshot(snapshot.value, id) : undefined
    })

    return {
      itemSnapshot,
      index: computed(() => itemSnapshot.value?.index ?? -1),
      isFirst: computed(() => itemSnapshot.value?.isFirst ?? false),
      isLast: computed(() => itemSnapshot.value?.isLast ?? false),
    }
  }

  function useCollectionItems(
    options: UseCollectionItemsOptions<TItem>,
  ): UseCollectionItemsReturn<TItem> {
    const context = provideCollection()
    const registeredIds = new Set<ItemId>()

    // 先注册当前列表，再设置逻辑顺序，避免 setOrder 过滤掉本轮新增 id
    watch(
      () => toValue(options.items),
      (items) => {
        const nextIds = new Set<ItemId>()

        for (const item of items) {
          context.controller.register(item)
          nextIds.add(item.id)
        }

        for (const id of registeredIds) {
          if (!nextIds.has(id)) {
            context.controller.unregister(id)
          }
        }

        context.controller.setOrder(items.map((item) => item.id))

        registeredIds.clear()
        for (const id of nextIds) {
          registeredIds.add(id)
        }
      },
      { deep: true, immediate: true },
    )

    onScopeDispose(() => {
      context.controller.clear()
      registeredIds.clear()
    })

    return {
      context,
      snapshot: context.snapshot,
    }
  }

  return {
    key,
    provideCollection,
    useCollection,
    useCollectionItem,
    useCollectionItems,
  }
}

function getItemOwners<TItem extends CollectionItem>(
  itemOwners: WeakMap<CollectionContext<TItem>, Map<ItemId, symbol>>,
  context: CollectionContext<TItem>,
): Map<ItemId, symbol> {
  const owners = itemOwners.get(context)
  if (!owners) {
    throw new Error('Missing collection item owner registry.')
  }

  return owners
}

function assertAvailableItemId(
  owners: ReadonlyMap<ItemId, symbol>,
  exists: boolean,
  id: ItemId,
  owner: symbol,
  previousId: ItemId | undefined,
): void {
  const currentOwner = owners.get(id)
  const isCurrentItem = currentOwner === owner && previousId === id

  if ((currentOwner && currentOwner !== owner) || (exists && !isCurrentItem)) {
    throw new Error(`Collection item id "${id}" is already registered.`)
  }
}

function releaseItemId(
  owners: Map<ItemId, symbol>,
  id: ItemId,
  owner: symbol,
): void {
  if (owners.get(id) === owner) {
    owners.delete(id)
  }
}

function resolveItem<TItem extends CollectionItem>(
  options: UseCollectionItemOptions<TItem>,
): TItem {
  if ('item' in options) {
    return toValue(options.item)
  }

  return {
    id: toValue(options.id),
    data: toValue(options.data),
  } as TItem
}

function getItemSnapshot<TItem extends CollectionItem>(
  snapshot: CollectionSnapshot<TItem>,
  id: ItemId,
): CollectionItemSnapshot<TItem> | undefined {
  const index = snapshot.orderedIds.indexOf(id)
  if (index === -1) return undefined

  return {
    id,
    item: snapshot.orderedItems[index]!,
    index,
    isFirst: index === 0,
    isLast: index === snapshot.orderedIds.length - 1,
  }
}
