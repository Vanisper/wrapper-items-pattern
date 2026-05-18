import { describe, expect, expectTypeOf, it } from 'vitest'
import { createOrderRegistry } from './index'
import type {
  OrderRegistry,
  OrderRegistryHandler,
  OrderRegistryScheduler,
} from './index'

async function flushMicrotask(): Promise<void> {
  await Promise.resolve()
}

describe('createOrderRegistry 顺序登记器', () => {
  it('保留传入的 id 类型', () => {
    type Id = 'intro' | 'usage'

    const registry = createOrderRegistry<Id>(() => {})

    expectTypeOf(registry).toEqualTypeOf<OrderRegistry<Id>>()
    expectTypeOf(registry.set).parameter(0).toEqualTypeOf<Id>()
    expectTypeOf(registry.getOrderedIds()).toEqualTypeOf<readonly Id[]>()
  })

  it('约束 handler 和 scheduler 的类型', () => {
    expectTypeOf<OrderRegistryHandler>().toEqualTypeOf<
      (orderedIds: readonly string[]) => void
    >()
    expectTypeOf<OrderRegistryScheduler>().toEqualTypeOf<
      (flush: () => void) => void
    >()
  })

  it('按登记的 order 产出 orderedIds', async () => {
    const calls: string[][] = []
    const registry = createOrderRegistry((orderedIds) => {
      calls.push([...orderedIds])
    })

    registry.set('1', 0)
    registry.set('3', 2)
    registry.set('2', 1)

    expect(calls).toEqual([])

    await flushMicrotask()

    expect(calls).toEqual([['1', '2', '3']])
    expect(registry.getOrderedIds()).toEqual(['1', '2', '3'])
  })

  it('同一轮多次登记只触发一次 handler', async () => {
    const calls: string[][] = []
    const registry = createOrderRegistry((orderedIds) => {
      calls.push([...orderedIds])
    })

    registry.set('a', 0)
    registry.set('b', 1)
    registry.set('c', 2)

    await flushMicrotask()

    expect(calls).toEqual([['a', 'b', 'c']])
  })

  it('登记内容未改变时不会重复触发 handler', async () => {
    const calls: string[][] = []
    const registry = createOrderRegistry((orderedIds) => {
      calls.push([...orderedIds])
    })

    registry.set('a', 0)
    await flushMicrotask()

    registry.set('a', 0)
    await flushMicrotask()

    expect(calls).toEqual([['a']])
  })

  it('更新 order 后会重新产出 orderedIds', async () => {
    const calls: string[][] = []
    const registry = createOrderRegistry((orderedIds) => {
      calls.push([...orderedIds])
    })

    registry.set('a', 0)
    registry.set('b', 1)
    await flushMicrotask()

    registry.set('a', 2)
    await flushMicrotask()

    expect(calls).toEqual([
      ['a', 'b'],
      ['b', 'a'],
    ])
    expect(registry.get('a')).toBe(2)
  })

  it('删除和清空登记信息后会同步最新 orderedIds', async () => {
    const calls: string[][] = []
    const registry = createOrderRegistry((orderedIds) => {
      calls.push([...orderedIds])
    })

    registry.set('a', 0)
    registry.set('b', 1)
    registry.set('c', 2)
    await flushMicrotask()

    expect(registry.delete('b')).toBe(true)
    expect(registry.delete('missing')).toBe(false)
    await flushMicrotask()

    registry.clear()
    await flushMicrotask()

    expect(calls).toEqual([
      ['a', 'b', 'c'],
      ['a', 'c'],
      [],
    ])
    expect(registry.size).toBe(0)
  })

  it('登记后又在同一轮删除时不会触发无效同步', async () => {
    const calls: string[][] = []
    const registry = createOrderRegistry((orderedIds) => {
      calls.push([...orderedIds])
    })

    registry.set('a', 0)
    registry.delete('a')

    await flushMicrotask()

    expect(calls).toEqual([])
  })

  it('可以手动执行待同步任务', () => {
    const calls: string[][] = []
    const scheduled: Array<() => void> = []
    const registry = createOrderRegistry(
      (orderedIds) => {
        calls.push([...orderedIds])
      },
      {
        scheduler(flush) {
          scheduled.push(flush)
        },
      },
    )

    registry.set('a', 0)

    expect(calls).toEqual([])
    expect(registry.flush()).toBe(true)
    expect(registry.flush()).toBe(false)
    expect(calls).toEqual([['a']])
    expect(scheduled).toHaveLength(1)
  })

  it('dispose 后不再触发 handler', async () => {
    const calls: string[][] = []
    const registry = createOrderRegistry((orderedIds) => {
      calls.push([...orderedIds])
    })

    registry.set('a', 0)
    registry.dispose()
    registry.set('b', 1)

    await flushMicrotask()

    expect(calls).toEqual([])
  })

  it('拒绝无效 id 和 order', () => {
    const registry = createOrderRegistry(() => {})

    expect(() => registry.set('', 0)).toThrow(/non-empty string/)
    expect(() => registry.has('')).toThrow(/non-empty string/)
    expect(() => registry.set('a', Number.NaN)).toThrow(/finite number/)
    expect(() => registry.set('a', Number.POSITIVE_INFINITY)).toThrow(
      /finite number/,
    )
  })
})
