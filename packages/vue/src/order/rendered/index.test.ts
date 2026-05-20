import { describe, expect, expectTypeOf, it } from 'vitest'
import { defineComponent, h, nextTick, shallowRef } from 'vue'
import {
  createRenderedOrderContext,
  useRenderedItemOrder,
} from './index'
import { mount } from '../../test-utils'
import type {
  RenderedOrderContext,
  RenderedOrderContextHelpers,
  RenderedOrderHandler,
} from './index'
import type { MaybeRefOrGetter } from 'vue'

describe('createRenderedOrderContext 渲染顺序上下文', () => {
  it('保留传入的 id 类型', () => {
    type Id = 'intro' | 'usage'

    const helpers = createRenderedOrderContext<Id>()

    expectTypeOf(helpers).toEqualTypeOf<RenderedOrderContextHelpers<Id>>()
    expectTypeOf(helpers.useRenderedOrder).returns.toEqualTypeOf<
      RenderedOrderContext<Id>
    >()
    expectTypeOf<RenderedOrderHandler<Id>>().toEqualTypeOf<
      (orderedIds: readonly Id[]) => void
    >()
  })

  it('按父级渲染结构同步 orderedIds', async () => {
    const helpers = createRenderedOrderContext()
    const firstId = shallowRef<string>()
    const secondId = shallowRef<string>()
    const thirdId = shallowRef<string>()
    const calls: string[][] = []

    const FirstChild = defineRenderedChild(helpers, firstId)
    const SecondChild = defineRenderedChild(helpers, secondId)
    const ThirdChild = defineRenderedChild(helpers, thirdId)

    mount(() => {
      helpers.provideRenderedOrder((ids) => {
        calls.push([...ids])
      })

      return () => h('div', [h(FirstChild), h(SecondChild), h(ThirdChild)])
    })

    thirdId.value = 'c'
    firstId.value = 'a'
    secondId.value = 'b'
    await nextTick()
    await Promise.resolve()

    expect(calls).toEqual([['a', 'b', 'c']])
  })

  it('父级渲染顺序变化后会重新同步 orderedIds', async () => {
    const helpers = createRenderedOrderContext()
    const order = shallowRef(['a', 'b', 'c'])
    const calls: string[][] = []

    const Child = defineComponent({
      props: {
        id: {
          type: String,
          required: true,
        },
      },
      setup(props) {
        useRenderedItemOrder(helpers.useRenderedOrder(), () => props.id)
        return () => h('span')
      },
    })

    mount(() => {
      helpers.provideRenderedOrder((ids) => {
        calls.push([...ids])
      })

      return () => h('div', order.value.map((id) => h(Child, { key: id, id })))
    })

    await nextTick()
    await Promise.resolve()

    order.value = ['c', 'a', 'b']
    await nextTick()
    await Promise.resolve()

    expect(calls).toEqual([
      ['a', 'b', 'c'],
      ['c', 'a', 'b'],
    ])
  })

  it('子项 id 为空时暂不进入渲染顺序队列', async () => {
    const helpers = createRenderedOrderContext()
    const id = shallowRef<string>()
    const calls: string[][] = []
    const Child = defineRenderedChild(helpers, id)

    mount(() => {
      helpers.provideRenderedOrder((ids) => {
        calls.push([...ids])
      })

      return () => h(Child)
    })

    await nextTick()
    await Promise.resolve()
    expect(calls).toEqual([])

    id.value = 'a'
    await nextTick()
    await Promise.resolve()
    expect(calls).toEqual([['a']])

    id.value = undefined
    await nextTick()
    await Promise.resolve()
    expect(calls).toEqual([['a'], []])
  })

  it('支持自定义调度器合并渲染顺序同步', () => {
    const helpers = createRenderedOrderContext()
    const tasks: Array<() => void> = []
    const calls: string[][] = []

    const FirstChild = defineRenderedChild(helpers, 'a')
    const SecondChild = defineRenderedChild(helpers, 'b')

    mount(() => {
      helpers.provideRenderedOrder(
        (ids) => {
          calls.push([...ids])
        },
        {
          scheduler(flush) {
            tasks.push(flush)
          },
        },
      )

      return () => h('div', [h(FirstChild), h(SecondChild)])
    })

    expect(calls).toEqual([])
    expect(tasks).toHaveLength(1)

    tasks[0]?.()

    expect(calls).toEqual([['a', 'b']])
  })

  it('缺少 provider 时会抛出明确错误', () => {
    const missingProviderMessage = '缺少 rendered order provider'
    const helpers = createRenderedOrderContext({ missingProviderMessage })
    let error: unknown

    mount(() => {
      try {
        useRenderedItemOrder(helpers.useRenderedOrder(), 'a')
      } catch (cause) {
        error = cause
      }

      return () => null
    })

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe(missingProviderMessage)
  })
})

function defineRenderedChild(
  helpers: RenderedOrderContextHelpers,
  id: MaybeRefOrGetter<string | undefined>,
): ReturnType<typeof defineComponent> {
  return defineComponent({
    setup() {
      useRenderedItemOrder(helpers.useRenderedOrder(), id)
      return () => h('span')
    },
  })
}
