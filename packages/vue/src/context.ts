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
  TData,
  TItem extends CollectionItem<TData> = CollectionItem<TData>,
>(
  options: CreateCollectionContextOptions<TData, TItem> = {},
): CollectionContextHelpers<TData, TItem> {
  const key =
    options.key ?? (Symbol('wrapper-items:collection') as InjectionKey<
      CollectionContext<TData, TItem>
    >)
  const missingProviderMessage =
    options.missingProviderMessage ??
    'Missing collection provider. Call provideCollection() in an ancestor setup scope first.'

  function provideCollection(
    options: ProvideCollectionOptions<TData, TItem> = {},
  ): CollectionContext<TData, TItem> {
    const controller = options.controller ?? createCollectionController<TData, TItem>()
    const snapshot = shallowRef(controller.getSnapshot())

    // controller 是外部状态源，Vue 侧只替换 snapshot 引用来触发更新
    const unsubscribe = controller.subscribe((notify) => {
      snapshot.value = notify.snapshot
    })

    onScopeDispose(unsubscribe)

    const context: CollectionContext<TData, TItem> = {
      controller,
      snapshot: readonly(snapshot) as CollectionContext<TData, TItem>['snapshot'],
    }

    provide(key, context)
    return context
  }

  function useCollection(): CollectionContext<TData, TItem> {
    const context = inject(key, null)
    if (!context) throw new Error(missingProviderMessage)
    return context
  }

  function useCollectionItem(
    options: UseCollectionItemOptions<TData, TItem>,
  ): UseCollectionItemReturn<TData, TItem> {
    const context = useCollection()
    const { controller, snapshot } = context
    const currentId = shallowRef<ItemId>()

    // core 约束 item id 稳定，id 变化时要先检查新 id，再注销旧项并重新注册
    watch(
      () => resolveItem(options),
      (item) => {
        const previousId = currentId.value

        // item 组件作用域数据变化但 id 不变
        // 尝试 update，返回 false 说明未注册，则将执行注册
        if (previousId === item.id) {
          if (!controller.update(item.id, () => item)) {
            controller.register(item)
          }
          return
        }

        // item 组件作用域内注册 id 发生改变
        // 如果检查当前 id 已被注册，将报错，避免冲突
        if (controller.has(item.id)) {
          throw new Error(`Collection item id "${item.id}" is already registered.`)
        }

        // unregister 旧项
        // register 新项，更新 currentId

        if (previousId) {
          controller.unregister(previousId)
        }

        controller.register(item)
        currentId.value = item.id
      },
      { deep: true, immediate: true },
    )

    onScopeDispose(() => {
      if (currentId.value) {
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
    options: UseCollectionItemsOptions<TData, TItem>,
  ): UseCollectionItemsReturn<TData, TItem> {
    const context = provideCollection()
    // 只清理本 composable 同步过的 id，避免误删外部 controller 中的其他 item
    const registeredIds = new Set<ItemId>()

    // 先注册当前列表，再设置逻辑顺序，避免 setOrder 过滤掉本轮新增 id
    watch(
      () => toValue(options.items),
      (items) => {
        const nextIds = new Set<ItemId>()

        for (const item of items) {
          if (registeredIds.has(item.id)) {
            context.controller.update(item.id, () => item)
          } else {
            context.controller.register(item)
          }

          nextIds.add(item.id)
        }

        // unregister 不在新列表中的项
        for (const id of registeredIds) {
          if (!nextIds.has(id)) {
            context.controller.unregister(id)
          }
        }

        // 根据新列表调整顺序
        context.controller.setOrder(items.map((item) => item.id))

        // registeredIds 换新
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
 * 归一化单个 item 注册参数
 */
function resolveItem<TData, TItem extends CollectionItem<TData>>(
  options: UseCollectionItemOptions<TData, TItem>,
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
function getItemSnapshot<TData, TItem extends CollectionItem<TData>>(
  snapshot: CollectionSnapshot<TData, TItem>,
  id: ItemId,
): CollectionItemSnapshot<TData, TItem> | undefined {
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
