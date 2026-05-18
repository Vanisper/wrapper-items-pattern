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
  // 同一个 context factory 可以创建多个 provider，每个 provider 都需要独立记录 id 占用关系
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

    // controller 是外部状态源，Vue 侧只替换 snapshot 引用来触发更新
    const unsubscribe = controller.subscribe((notify) => {
      snapshot.value = notify.snapshot
    })

    onScopeDispose(unsubscribe)

    const context: CollectionContext<TItem> = {
      controller,
      snapshot: readonly(snapshot) as CollectionContext<TItem>['snapshot'],
    }

    // id 占用关系属于 provider 生命周期，不能挂在 context factory 或 controller 全局共享
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
    // 使用 symbol 表达当前 composable scope 的身份，避免只靠 id 判断自己和其他子项
    const owner = Symbol('wrapper-items:item-owner')
    const currentId = shallowRef<ItemId>()

    // core 约束 item id 稳定，id 变化时要先检查新 id，再注销旧项并重新注册
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
    // 只清理本 composable 同步过的 id，避免误删外部 controller 中的其他 item
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

/**
 * 读取当前 provider 对应的 id 占用表
 *
 * @description 如果这里缺失，说明 useCollectionItem 没有通过同一个 context provider 初始化
 */
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

/**
 * 检查 id 是否可以由当前 scope 注册
 *
 * @description 已存在且属于当前 scope 的 id 允许更新，其余已存在 id 都视为冲突
 */
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

/**
 * 释放当前 scope 持有的 id
 *
 * @description 避免异常路径或重复清理误删其他 scope 的占用关系
 */
function releaseItemId(
  owners: Map<ItemId, symbol>,
  id: ItemId,
  owner: symbol,
): void {
  if (owners.get(id) === owner) {
    owners.delete(id)
  }
}

/**
 * 归一化单个 item 注册参数
 */
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

/**
 * 从 collection snapshot 派生单个 item 的位置快照
 */
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
