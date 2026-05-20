import {
  getCurrentInstance,
  inject,
  isVNode,
  onMounted,
  onScopeDispose,
  onUpdated,
  provide,
  toValue,
  watch,
} from 'vue'
import type {
  ComponentInternalInstance,
  InjectionKey,
  MaybeRefOrGetter,
  VNode,
} from 'vue'
import type {
  CreateRenderedOrderContextOptions,
  ProvideRenderedOrderOptions,
  RenderedOrderContext,
  RenderedOrderContextHelpers,
  RenderedOrderHandler,
} from './types'

/**
 * 创建渲染顺序上下文
 *
 * @description 适合子项注册时机可能不同步，但最终顺序应贴合父级渲染结构的 wrapper/items 场景
 */
export function createRenderedOrderContext<
  TId extends string = string,
>(
  options: CreateRenderedOrderContextOptions<TId> = {},
): RenderedOrderContextHelpers<TId> {
  const key =
    options.key ?? (Symbol('wrapper-items:rendered-order') as InjectionKey<
      RenderedOrderContext<TId>
    >)
  const missingProviderMessage =
    options.missingProviderMessage ??
    'Missing rendered order provider. Call provideRenderedOrder() in an ancestor setup scope first.'

  function provideRenderedOrder(
    handler: RenderedOrderHandler<TId>,
    options: ProvideRenderedOrderOptions = {},
  ): RenderedOrderContext<TId> {
    const instance = options.instance ?? getCurrentInstance()
    if (!instance) {
      throw new Error('provideRenderedOrder() must be called inside setup().')
    }

    const scheduler = options.scheduler ?? queueMicrotask
    const children = new Map<number, TId>()
    const source = options.source ?? (() => instance.subTree)
    let pending = false
    let disposed = false
    let lastOrderedIds: readonly TId[] = Object.freeze([])

    function getOrderedIds(): readonly TId[] {
      const orderedIds: TId[] = []
      const seen = new Set<number>()

      for (const childInstance of findRenderedChildInstances(toValue(source))) {
        const id = children.get(childInstance.uid)
        if (id && !seen.has(childInstance.uid)) {
          orderedIds.push(id)
          seen.add(childInstance.uid)
        }
      }

      return Object.freeze(orderedIds)
    }

    function requestSync(): void {
      if (pending || disposed) return

      pending = true
      scheduler(() => {
        flush()
      })
    }

    function flush(): boolean {
      if (!pending || disposed) return false

      pending = false
      const orderedIds = getOrderedIds()
      if (isSameIds(lastOrderedIds, orderedIds)) return false

      lastOrderedIds = orderedIds
      handler(orderedIds)
      return true
    }

    const context: RenderedOrderContext<TId> = {
      registerItemOrder(id, childInstance) {
        childInstance ??= getCurrentInstance()

        if (!childInstance) {
          throw new Error('registerItemOrder() must be called inside setup().')
        }

        let currentId: TId | undefined

        watch(
          () => toValue(id),
          (nextId) => {
            if (nextId) {
              currentId = nextId
              children.set(childInstance.uid, nextId)
            } else if (currentId) {
              currentId = undefined
              children.delete(childInstance.uid)
            }

            requestSync()
          },
          { immediate: true },
        )

        onScopeDispose(() => {
          if (currentId) {
            children.delete(childInstance.uid)
            requestSync()
          }
        })
      },

      requestSync,
      flush,
    }

    onMounted(requestSync)
    onUpdated(requestSync)
    onScopeDispose(() => {
      disposed = true
      pending = false
      children.clear()
    })

    provide(key, context)
    return context
  }

  function useRenderedOrder(): RenderedOrderContext<TId> {
    const context = inject(key, null)
    if (!context) throw new Error(missingProviderMessage)
    return context
  }

  return {
    key,
    provideRenderedOrder,
    useRenderedOrder,
  }
}

/**
 * 登记 item 的渲染顺序
 */
export function useRenderedItemOrder<TId extends string>(
  context: RenderedOrderContext<TId>,
  id: MaybeRefOrGetter<TId | undefined>,
): void {
  context.registerItemOrder(id)
}

function findRenderedChildInstances(
  source: VNode | readonly unknown[] | undefined | null,
): ComponentInternalInstance[] {
  const result: ComponentInternalInstance[] = []

  walkRenderedChildren(source, result)
  return result
}

function walkRenderedChildren(
  source: VNode | readonly unknown[] | undefined | null,
  result: ComponentInternalInstance[],
): void {
  if (!source) return

  if (Array.isArray(source)) {
    for (const child of source) {
      walkRenderedChildren(
        child as VNode | readonly unknown[] | null | undefined,
        result,
      )
    }
    return
  }

  if (!isVNode(source)) return

  if (source.component) {
    result.push(source.component)

    if (source.component.subTree) {
      walkRenderedChildren(source.component.subTree, result)
    }
  }

  if (Array.isArray(source.children)) {
    walkRenderedChildren(source.children, result)
  }
}

function isSameIds<TId extends string>(
  left: readonly TId[],
  right: readonly TId[],
): boolean {
  return (
    left.length === right.length &&
    left.every((id, index) => Object.is(id, right[index]))
  )
}
