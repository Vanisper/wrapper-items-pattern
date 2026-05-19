import { createCollectionController } from '@wrapper-items/core'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  createRenderer,
  defineComponent,
  h,
  nextTick,
  reactive,
  shallowRef,
} from 'vue'
import { createCollectionContext } from './index'
import type {
  CollectionContext,
  CollectionContextHelpers,
  UseCollectionItemReturn,
} from './index'
import type { App } from 'vue'

interface TestData {
  label: string
}

interface TestItem {
  id: string
  data?: TestData
}

interface TestNode {
  children: TestNode[]
  parent: TestNode | null
  text?: string
  type?: string
}

const renderer = createRenderer<TestNode, TestNode>({
  patchProp() {},

  insert(child, parent, anchor = null) {
    child.parent = parent

    if (!anchor) {
      parent.children.push(child)
      return
    }

    const index = parent.children.indexOf(anchor)
    if (index === -1) {
      parent.children.push(child)
      return
    }

    parent.children.splice(index, 0, child)
  },

  remove(child) {
    const parent = child.parent
    if (!parent) return

    const index = parent.children.indexOf(child)
    if (index !== -1) {
      parent.children.splice(index, 1)
    }
    child.parent = null
  },

  createElement(type) {
    return { type, children: [], parent: null }
  },

  createText(text) {
    return { text, children: [], parent: null }
  },

  createComment(text) {
    return { text, children: [], parent: null }
  },

  setText(node, text) {
    node.text = text
  },

  setElementText(node, text) {
    node.text = text
  },

  parentNode(node) {
    return node.parent
  },

  nextSibling(node) {
    const parent = node.parent
    if (!parent) return null

    const index = parent.children.indexOf(node)
    return parent.children[index + 1] ?? null
  },
})

interface MountOptions {
  onError?: (error: unknown) => void
}

function mount(
  setup: () => () => unknown,
  options: MountOptions = {},
): App<TestNode> {
  const Root = defineComponent({
    setup,
  })
  const root: TestNode = { children: [], parent: null }
  const app = renderer.createApp(Root)

  if (options.onError) {
    app.config.errorHandler = (error) => {
      options.onError?.(error)
    }
  }

  app.mount(root)
  return app
}

describe('createCollectionContext Vue 上下文', () => {
  it('保留传入的 item 类型', () => {
    const helpers = createCollectionContext<TestData>()

    expectTypeOf(helpers).toEqualTypeOf<
      CollectionContextHelpers<TestData, TestItem>
    >()
    expectTypeOf(helpers.useCollection).returns.toEqualTypeOf<
      CollectionContext<TestData, TestItem>
    >()
    expectTypeOf(helpers.useCollectionItem).returns.toEqualTypeOf<
      UseCollectionItemReturn<TestData, TestItem>
    >()
  })

  it('provide 后可以读取响应式 snapshot', () => {
    const helpers = createCollectionContext<TestData>()
    const controller = createCollectionController<TestData>()
    let context!: CollectionContext<TestData, TestItem>

    mount(() => {
      context = helpers.provideCollection({ controller })
      return () => null
    })

    expect(context.snapshot.value.orderedIds).toEqual([])

    controller.register({ id: 'a', data: { label: 'A' } })

    expect(context.snapshot.value.orderedIds).toEqual(['a'])
  })

  it('缺少 provider 时会抛出明确错误', () => {
    const missingProviderMessage = '缺少 collection provider'
    const helpers = createCollectionContext<TestData>({ missingProviderMessage })
    let error: unknown

    mount(() => {
      try {
        helpers.useCollection()
      } catch (cause) {
        error = cause
      }

      return () => null
    })

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe(missingProviderMessage)
  })

  it('子项会随组件生命周期注册和注销', () => {
    const helpers = createCollectionContext<TestData>()
    let context!: CollectionContext<TestData, TestItem>
    let child!: UseCollectionItemReturn<TestData, TestItem>

    const Child = defineComponent({
      setup() {
        child = helpers.useCollectionItem({
          id: 'a',
          data: { label: 'A' },
        })
        return () => null
      },
    })

    const app = mount(() => {
      context = helpers.provideCollection()
      return () => h(Child)
    })

    expect(context.snapshot.value.orderedIds).toEqual(['a'])
    expect(child.index.value).toBe(0)
    expect(child.isFirst.value).toBe(true)
    expect(child.isLast.value).toBe(true)

    app.unmount()

    expect(context.controller.size).toBe(0)
  })

  it('子项 id 变化时会注销旧 item 并注册新 item', async () => {
    const helpers = createCollectionContext<TestData>()
    const id = shallowRef('a')
    const data = shallowRef({ label: 'A' })
    let context!: CollectionContext<TestData, TestItem>
    let child!: UseCollectionItemReturn<TestData, TestItem>

    const Child = defineComponent({
      setup() {
        child = helpers.useCollectionItem({ id, data })
        return () => null
      },
    })

    mount(() => {
      context = helpers.provideCollection()
      return () => h(Child)
    })

    data.value = { label: 'AA' }
    await nextTick()

    expect(context.controller.get('a')?.data).toEqual({ label: 'AA' })

    id.value = 'b'
    await nextTick()

    expect(context.controller.has('a')).toBe(false)
    expect(context.controller.get('b')?.data).toEqual({ label: 'AA' })
    expect(context.snapshot.value.orderedIds).toEqual(['b'])
    expect(child.itemSnapshot.value?.id).toBe('b')
  })

  it('子项 id 变化到已占用 id 时会保留原注册项', async () => {
    const helpers = createCollectionContext<TestData>()
    const id = shallowRef('a')
    let context!: CollectionContext<TestData, TestItem>
    let child!: UseCollectionItemReturn<TestData, TestItem>
    let error: unknown

    const FirstChild = defineComponent({
      setup() {
        child = helpers.useCollectionItem({
          id,
          data: { label: 'A' },
        })
        return () => null
      },
    })
    const SecondChild = defineComponent({
      setup() {
        helpers.useCollectionItem({
          id: 'b',
          data: { label: 'B' },
        })
        return () => null
      },
    })

    mount(
      () => {
        context = helpers.provideCollection()
        return () => h('div', [h(FirstChild), h(SecondChild)])
      },
      {
        onError(cause) {
          error = cause
        },
      },
    )

    id.value = 'b'
    await nextTick()

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe(
      'Collection item id "b" is already registered.',
    )
    expect(context.snapshot.value.orderedIds).toEqual(['a', 'b'])
    expect(context.controller.get('a')?.data).toEqual({ label: 'A' })
    expect(context.controller.get('b')?.data).toEqual({ label: 'B' })
    expect(child.itemSnapshot.value?.id).toBe('a')
  })

  it('子项 id 变化到 controller 已有 id 时会保留原注册项', async () => {
    const helpers = createCollectionContext<TestData>()
    const controller = createCollectionController<TestData>()
    const id = shallowRef('a')
    let context!: CollectionContext<TestData, TestItem>
    let error: unknown

    controller.register({ id: 'b', data: { label: 'B' } })

    const Child = defineComponent({
      setup() {
        helpers.useCollectionItem({
          id,
          data: { label: 'A' },
        })
        return () => null
      },
    })

    mount(
      () => {
        context = helpers.provideCollection({ controller })
        return () => h(Child)
      },
      {
        onError(cause) {
          error = cause
        },
      },
    )

    id.value = 'b'
    await nextTick()

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe(
      'Collection item id "b" is already registered.',
    )
    expect(context.snapshot.value.orderedIds).toEqual(['b', 'a'])
    expect(context.controller.get('a')?.data).toEqual({ label: 'A' })
    expect(context.controller.get('b')?.data).toEqual({ label: 'B' })
  })

  it('子项支持用完整 item 注册', async () => {
    const helpers = createCollectionContext<TestData>()
    const item = shallowRef<TestItem>({ id: 'a', data: { label: 'A' } })
    let context!: CollectionContext<TestData, TestItem>

    const Child = defineComponent({
      setup() {
        helpers.useCollectionItem({ item })
        return () => null
      },
    })

    mount(() => {
      context = helpers.provideCollection()
      return () => h(Child)
    })

    item.value = { id: 'a', data: { label: 'AA' } }
    await nextTick()

    expect(context.controller.get('a')).toEqual({
      id: 'a',
      data: { label: 'AA' },
    })
  })

  it('完整 item 原地变化时会更新注册项', async () => {
    const helpers = createCollectionContext<TestData>()
    const item = reactive<TestItem>({ id: 'a', data: { label: 'A' } })
    let context!: CollectionContext<TestData, TestItem>

    const Child = defineComponent({
      setup() {
        helpers.useCollectionItem({ item })
        return () => null
      },
    })

    mount(() => {
      context = helpers.provideCollection()
      return () => h(Child)
    })

    item.data = { label: 'AA' }
    await nextTick()

    expect(context.controller.get('a')?.data).toEqual({ label: 'AA' })
  })

  it('数据驱动 items 会同步注册项和逻辑顺序', async () => {
    const helpers = createCollectionContext<TestData>()
    const items = shallowRef<readonly TestItem[]>([
      { id: 'a', data: { label: 'A' } },
      { id: 'b', data: { label: 'B' } },
    ])
    let context!: CollectionContext<TestData, TestItem>

    mount(() => {
      const result = helpers.useCollectionItems({ items })
      context = result.context
      return () => null
    })

    expect(context.snapshot.value.orderedIds).toEqual(['a', 'b'])

    items.value = [
      { id: 'c', data: { label: 'C' } },
      { id: 'a', data: { label: 'AA' } },
    ]
    await nextTick()

    expect(context.controller.has('b')).toBe(false)
    expect(context.snapshot.value.orderedIds).toEqual(['c', 'a'])
    expect(context.snapshot.value.orderedItems.map((item) => item.data?.label))
      .toEqual(['C', 'AA'])
  })
})
