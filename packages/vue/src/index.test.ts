import { createCollectionController } from '@wrapper-items/core'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { createRenderer, defineComponent, h, nextTick, reactive, shallowRef } from 'vue'
import { createCollectionContext } from './index'
import type {
  CollectionContext,
  CollectionContextHelpers,
  UseCollectionItemReturn,
} from './index'
import type { App } from 'vue'

interface TestItem {
  id: string
  data?: {
    label: string
  }
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

function mount(setup: () => () => unknown): App<TestNode> {
  const Root = defineComponent({
    setup,
  })
  const root: TestNode = { children: [], parent: null }
  const app = renderer.createApp(Root)

  app.mount(root)
  return app
}

describe('createCollectionContext Vue 上下文', () => {
  it('保留传入的 item 类型', () => {
    const helpers = createCollectionContext<TestItem>()

    expectTypeOf(helpers).toEqualTypeOf<CollectionContextHelpers<TestItem>>()
    expectTypeOf(helpers.useCollection).returns.toEqualTypeOf<
      CollectionContext<TestItem>
    >()
    expectTypeOf(helpers.useCollectionItem).returns.toEqualTypeOf<
      UseCollectionItemReturn<TestItem>
    >()
  })

  it('provide 后可以读取响应式 snapshot', () => {
    const helpers = createCollectionContext<TestItem>()
    const controller = createCollectionController<TestItem>()
    let context!: CollectionContext<TestItem>

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
    const helpers = createCollectionContext<TestItem>({ missingProviderMessage })
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
    const helpers = createCollectionContext<TestItem>()
    let context!: CollectionContext<TestItem>
    let child!: UseCollectionItemReturn<TestItem>

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
    const helpers = createCollectionContext<TestItem>()
    const id = shallowRef('a')
    const data = shallowRef({ label: 'A' })
    let context!: CollectionContext<TestItem>
    let child!: UseCollectionItemReturn<TestItem>

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

  it('子项支持用完整 item 注册', async () => {
    const helpers = createCollectionContext<TestItem>()
    const item = shallowRef<TestItem>({ id: 'a', data: { label: 'A' } })
    let context!: CollectionContext<TestItem>

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
    const helpers = createCollectionContext<TestItem>()
    const item = reactive<TestItem>({ id: 'a', data: { label: 'A' } })
    let context!: CollectionContext<TestItem>

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
    const helpers = createCollectionContext<TestItem>()
    const items = shallowRef<readonly TestItem[]>([
      { id: 'a', data: { label: 'A' } },
      { id: 'b', data: { label: 'B' } },
    ])
    let context!: CollectionContext<TestItem>

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
