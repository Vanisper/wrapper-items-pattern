import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, shallowRef } from 'vue'
import {
  createDelayedOrderScheduler,
  createExplicitOrderContext,
  useExplicitItemOrder,
} from './index'
import { mount } from '../../test-utils'

describe('createExplicitOrderContext 显式顺序上下文', () => {
  it('根据子项声明顺序同步 orderedIds', async () => {
    const helpers = createExplicitOrderContext()
    const firstId = shallowRef<string>()
    const secondId = shallowRef<string>()
    const secondOrder = shallowRef(1)
    const calls: string[][] = []

    const FirstChild = defineComponent({
      setup() {
        useExplicitItemOrder(helpers.useExplicitOrder(), firstId, 0)
        return () => null
      },
    })
    const SecondChild = defineComponent({
      setup() {
        useExplicitItemOrder(helpers.useExplicitOrder(), secondId, secondOrder)
        return () => null
      },
    })

    mount(() => {
      helpers.provideExplicitOrder((ids) => {
        calls.push([...ids])
      })

      return () => h('div', [h(FirstChild), h(SecondChild)])
    })

    firstId.value = 'a'
    secondId.value = 'b'
    await nextTick()

    expect(calls).toEqual([['a', 'b']])

    secondOrder.value = -1
    await nextTick()

    expect(calls).toEqual([
      ['a', 'b'],
      ['b', 'a'],
    ])
  })

  it('子项 id 为空时暂不进入排序队列', async () => {
    const helpers = createExplicitOrderContext()
    const id = shallowRef<string>()
    const calls: string[][] = []

    const Child = defineComponent({
      setup() {
        useExplicitItemOrder(helpers.useExplicitOrder(), id, 0)
        return () => null
      },
    })

    mount(() => {
      helpers.provideExplicitOrder((ids) => {
        calls.push([...ids])
      })

      return () => h(Child)
    })

    await nextTick()
    expect(calls).toEqual([])

    id.value = 'a'
    await nextTick()
    expect(calls).toEqual([['a']])

    id.value = undefined
    await nextTick()
    expect(calls).toEqual([['a'], []])
  })

  it('支持自定义调度器合并顺序同步', () => {
    const helpers = createExplicitOrderContext()
    const tasks: Array<() => void> = []
    const calls: string[][] = []

    const FirstChild = defineComponent({
      setup() {
        useExplicitItemOrder(helpers.useExplicitOrder(), 'b', 1)
        return () => null
      },
    })
    const SecondChild = defineComponent({
      setup() {
        useExplicitItemOrder(helpers.useExplicitOrder(), 'a', 0)
        return () => null
      },
    })

    mount(() => {
      helpers.provideExplicitOrder(
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

  it('延迟调度器在非正数延迟下保持异步同步', async () => {
    const scheduler = createDelayedOrderScheduler(0)
    const calls: string[] = []

    scheduler(() => {
      calls.push('flush')
    })

    expect(calls).toEqual([])

    await Promise.resolve()

    expect(calls).toEqual(['flush'])
  })
})
