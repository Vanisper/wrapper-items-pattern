import { describe, expect, expectTypeOf, it } from 'vitest'
import { createCollectionController } from './index'
import type {
  CollectionChange,
  CollectionNotify,
  CollectionOperationType,
  CollectionSnapshot,
  Unsubscribe,
} from './index'

interface TestItem {
  id: string
  data?: {
    label: string
    rank?: number
  }
}

describe('createCollectionController 控制器', () => {
  it('保留传入的 item 类型', () => {
    const controller = createCollectionController<TestItem>()
    const snapshot = controller.getSnapshot()

    expectTypeOf(controller.get('a')).toEqualTypeOf<TestItem | undefined>()
    expectTypeOf(snapshot).toEqualTypeOf<CollectionSnapshot<TestItem>>()
    expectTypeOf(snapshot.items).toEqualTypeOf<readonly TestItem[]>()
    expectTypeOf(snapshot.orderedItems).toEqualTypeOf<readonly TestItem[]>()
    expectTypeOf(snapshot.orderedIds).toEqualTypeOf<readonly string[]>()
  })

  it('约束 update 和 subscribe 的类型', () => {
    const controller = createCollectionController<TestItem>()

    expectTypeOf(controller.update).parameter(0).toEqualTypeOf<string>()
    expectTypeOf(controller.update).parameter(1).toEqualTypeOf<
      Partial<TestItem> | ((item: TestItem) => TestItem)
    >()
    controller.subscribe((notify) => {
      expectTypeOf(notify).toEqualTypeOf<CollectionNotify<TestItem>>()
      expectTypeOf(notify.operation).toEqualTypeOf<
        CollectionOperationType | null
      >()
      expectTypeOf(notify.previousSnapshot).toEqualTypeOf<
        CollectionSnapshot<TestItem> | null
      >()
      expectTypeOf(notify.changes).toEqualTypeOf<
        readonly CollectionChange<TestItem>[]
      >()
    })
    expectTypeOf(controller.subscribe).returns.toEqualTypeOf<Unsubscribe>()
  })

  it('初始状态返回空的不可变快照', () => {
    const controller = createCollectionController<TestItem>()
    const snapshot = controller.getSnapshot()

    expect(controller.size).toBe(0)
    expect(snapshot.items).toEqual([])
    expect(snapshot.orderedIds).toEqual([])
    expect(snapshot.orderedItems).toEqual([])
    expect(Object.isFrozen(snapshot)).toBe(true)
    expect(Object.isFrozen(snapshot.items)).toBe(true)
    expect(Object.isFrozen(snapshot.orderedIds)).toBe(true)
    expect(Object.isFrozen(snapshot.orderedItems)).toBe(true)
  })

  it('注册 item 后默认使用注册顺序', () => {
    const controller = createCollectionController<TestItem>()
    const first = { id: 'a', data: { label: 'A' } }
    const second = { id: 'b', data: { label: 'B' } }

    controller.register(first)
    controller.register(second)

    expect(controller.size).toBe(2)
    expect(controller.get('a')).toBe(first)
    expect(controller.has('b')).toBe(true)
    expect(controller.getSnapshot()).toMatchObject({
      items: [first, second],
      orderedIds: ['a', 'b'],
      orderedItems: [first, second],
    })
  })

  it('注册相同 id 时会抛错并保留原 item', () => {
    const controller = createCollectionController<TestItem>()
    const oldItem = { id: 'a', data: { label: 'old' } }
    const nextItem = { id: 'a', data: { label: 'new' } }
    const second = { id: 'b', data: { label: 'B' } }

    controller.register(oldItem)
    controller.register(second)
    const beforeDuplicateRegister = controller.getSnapshot()

    expect(() => controller.register(nextItem)).toThrow(
      'Collection item id "a" is already registered.',
    )

    expect(controller.size).toBe(2)
    expect(controller.get('a')).toBe(oldItem)
    expect(controller.getSnapshot()).toBe(beforeDuplicateRegister)
    expect(controller.getSnapshot().orderedItems).toEqual([oldItem, second])
  })

  it('支持通过对象补丁或 callback 修改 item', () => {
    const controller = createCollectionController<TestItem>()
    controller.register({ id: 'a', data: { label: 'A' } })

    expect(controller.update('a', { data: { label: 'AA', rank: 1 } })).toBe(
      true,
    )
    expect(controller.get('a')).toEqual({
      id: 'a',
      data: { label: 'AA', rank: 1 },
    })

    expect(
      controller.update('a', (item) => ({
        ...item,
        data: { ...item.data!, label: 'AAA' },
      })),
    ).toBe(true)
    expect(controller.get('a')?.data?.label).toBe('AAA')

    expect(
      controller.update('a', () => ({
        id: 'a',
        data: { label: 'replace', rank: 2 },
      })),
    ).toBe(true)
    expect(controller.get('a')).toEqual({
      id: 'a',
      data: { label: 'replace', rank: 2 },
    })
    expect(controller.update('missing', { data: { label: 'noop' } })).toBe(
      false,
    )
  })

  it('更新 item 时不允许改变 id', () => {
    const controller = createCollectionController<TestItem>()
    controller.register({ id: 'a', data: { label: 'A' } })

    expect(() => controller.update('a', { id: 'b' })).toThrow(
      /cannot be changed/,
    )
    expect(() =>
      controller.update('a', (item) => ({ ...item, id: 'b' })),
    ).toThrow(/cannot be changed/)
  })

  it('注销 item 后会归一化当前顺序', () => {
    const controller = createCollectionController<TestItem>()
    const first = { id: 'a', data: { label: 'A' } }
    const second = { id: 'b', data: { label: 'B' } }
    const third = { id: 'c', data: { label: 'C' } }

    controller.register(first)
    controller.register(second)
    controller.register(third)
    controller.setOrder(['c', 'a'])

    expect(controller.unregister('c')).toBe(true)
    expect(controller.unregister('missing')).toBe(false)
    expect(controller.getSnapshot().orderedItems).toEqual([first, second])

    expect(controller.unregister(first)).toBe(true)
    expect(controller.getSnapshot().orderedIds).toEqual(['b'])
  })

  it('设置传入顺序时会过滤未知 id 并去重', () => {
    const controller = createCollectionController<TestItem>()
    const first = { id: 'a', data: { label: 'A' } }
    const second = { id: 'b', data: { label: 'B' } }
    const third = { id: 'c', data: { label: 'C' } }

    controller.register(first)
    controller.register(second)
    controller.register(third)
    controller.setOrder(['c', 'missing', 'a', 'c'])

    expect(controller.getSnapshot().orderedIds).toEqual(['c', 'a', 'b'])
    expect(controller.getSnapshot().orderedItems).toEqual([
      third,
      first,
      second,
    ])
  })

  it('传入顺序未覆盖的已注册 item 会追加到末尾', () => {
    const controller = createCollectionController<TestItem>()
    const first = { id: 'a', data: { label: 'A' } }
    const second = { id: 'b', data: { label: 'B' } }
    const third = { id: 'c', data: { label: 'C' } }

    controller.register(first)
    controller.register(second)
    controller.setOrder(['b'])
    controller.register(third)

    expect(controller.getSnapshot().orderedItems).toEqual([
      second,
      first,
      third,
    ])
  })

  it('设置空顺序时会按注册顺序追加全部 item', () => {
    const controller = createCollectionController<TestItem>()
    const first = { id: 'a', data: { label: 'A' } }
    const second = { id: 'b', data: { label: 'B' } }

    controller.register(first)
    controller.register(second)
    controller.setOrder([])

    expect(controller.getSnapshot().orderedItems).toEqual([first, second])
  })

  it('清除传入顺序后恢复注册顺序', () => {
    const controller = createCollectionController<TestItem>()
    controller.register({ id: 'a', data: { label: 'A' } })
    controller.register({ id: 'b', data: { label: 'B' } })
    controller.setOrder(['b', 'a'])

    controller.clearOrder()

    expect(controller.getSnapshot().orderedIds).toEqual(['a', 'b'])
  })

  it('清空所有 item 时也会清除顺序状态', () => {
    const controller = createCollectionController<TestItem>()
    controller.register({ id: 'a', data: { label: 'A' } })
    controller.setOrder(['a'])

    controller.clear()

    expect(controller.size).toBe(0)
    expect(controller.getSnapshot().orderedIds).toEqual([])
    controller.register({ id: 'b', data: { label: 'B' } })
    expect(controller.getSnapshot().orderedIds).toEqual(['b'])
  })

  it('可以读取单个 item 的位置快照', () => {
    const controller = createCollectionController<TestItem>()
    const first = { id: 'a', data: { label: 'A' } }
    const second = { id: 'b', data: { label: 'B' } }

    controller.register(first)
    controller.register(second)

    expect(controller.getItemSnapshot('a')).toEqual({
      id: 'a',
      item: first,
      index: 0,
      isFirst: true,
      isLast: false,
    })
    expect(controller.getItemSnapshot('b')).toEqual({
      id: 'b',
      item: second,
      index: 1,
      isFirst: false,
      isLast: true,
    })
    expect(controller.getItemSnapshot('missing')).toBeUndefined()
  })

  it('只冻结 snapshot 容器，不冻结 item 本身', () => {
    const controller = createCollectionController<TestItem>()
    const item = { id: 'a', data: { label: 'A' } }

    controller.register(item)

    const snapshot = controller.getSnapshot()
    expect(Object.isFrozen(snapshot.items[0])).toBe(false)
    expect(Object.isFrozen(snapshot.orderedItems[0])).toBe(false)
  })

  it('只有状态实际变化时才通知订阅者并更新快照引用', () => {
    const controller = createCollectionController<TestItem>()
    const calls: string[][] = []
    const unsubscribe = controller.subscribe((notify) => {
      calls.push([...notify.snapshot.orderedIds])
    })
    const item = { id: 'a', data: { label: 'A' } }

    controller.register(item)
    const afterRegister = controller.getSnapshot()
    expect(controller.update('a', (current) => current)).toBe(true)
    const afterNoopUpdate = controller.getSnapshot()
    controller.setOrder(['a'])
    controller.update('missing', { data: { label: 'noop' } })
    unsubscribe()
    controller.register({ id: 'b', data: { label: 'B' } })

    expect(afterNoopUpdate).toBe(afterRegister)
    expect(calls).toEqual([['a']])
  })

  it('订阅时可以立即收到当前快照', () => {
    const controller = createCollectionController<TestItem>()
    const calls: Array<{
      operation: CollectionOperationType | null
      orderedIds: string[]
      previousOrderedIds: string[] | null
      changeTypes: string[]
    }> = []

    controller.subscribe(
      (notify) => {
        calls.push({
          operation: notify.operation,
          orderedIds: [...notify.snapshot.orderedIds],
          previousOrderedIds: notify.previousSnapshot
            ? [...notify.previousSnapshot.orderedIds]
            : null,
          changeTypes: notify.changes.map((change) => change.type),
        })
      },
      { immediate: true },
    )

    expect(calls).toEqual([
      {
        operation: null,
        orderedIds: [],
        previousOrderedIds: null,
        changeTypes: [],
      },
    ])
  })

  it('通知中包含触发 snapshot 变化的操作来源', () => {
    const controller = createCollectionController<TestItem>()
    const calls: CollectionOperationType[] = []

    controller.subscribe((notify) => {
      if (notify.operation) calls.push(notify.operation)
    })

    controller.register({ id: 'a', data: { label: 'A' } })
    controller.update('a', { data: { label: 'AA' } })
    controller.register({ id: 'b', data: { label: 'B' } })
    controller.setOrder(['b', 'a'])
    controller.clearOrder()
    controller.unregister('b')
    controller.clear()

    expect(calls).toEqual([
      'register',
      'update',
      'register',
      'setOrder',
      'clearOrder',
      'unregister',
      'clear',
    ])
  })

  it('通知中包含本次变化前后的 snapshot', () => {
    const controller = createCollectionController<TestItem>()
    const calls: Array<{
      orderedIds: string[]
      previousOrderedIds: string[] | null
    }> = []

    controller.subscribe((notify) => {
      calls.push({
        orderedIds: [...notify.snapshot.orderedIds],
        previousOrderedIds: notify.previousSnapshot
          ? [...notify.previousSnapshot.orderedIds]
          : null,
      })
    })

    controller.register({ id: 'a', data: { label: 'A' } })
    controller.register({ id: 'b', data: { label: 'B' } })

    expect(calls).toEqual([
      { orderedIds: ['a'], previousOrderedIds: [] },
      { orderedIds: ['a', 'b'], previousOrderedIds: ['a'] },
    ])
  })

  it('通知中包含已提交的 collection/order 变化记录', () => {
    const controller = createCollectionController<TestItem>()
    const first = { id: 'a', data: { label: 'A' } }
    const nextFirst = { id: 'a', data: { label: 'AA' } }
    const second = { id: 'b', data: { label: 'B' } }
    const calls: Array<readonly CollectionChange<TestItem>[]> = []

    controller.subscribe((notify) => {
      calls.push(notify.changes)
    })

    controller.register(first)
    controller.update('a', () => nextFirst)
    controller.register(second)
    controller.setOrder(['b', 'a'])
    controller.unregister('b')

    expect(calls).toEqual([
      // register 时：
      // - 必然 ['item:registered', 'order:changed']
      // - 且 orderedIds 必然新增内容
      // - 且 orderedIds 与 previousOrderedIds 的差集必然为 'item:registered' 的 id
      [
        { type: 'item:registered', id: 'a', item: first },
        { type: 'order:changed', previousOrderedIds: [], orderedIds: ['a'] },
      ],
      [
        {
          type: 'item:updated',
          id: 'a',
          previousItem: first,
          item: nextFirst,
        },
      ],
      [
        { type: 'item:registered', id: 'b', item: second },
        {
          type: 'order:changed',
          previousOrderedIds: ['a'],
          orderedIds: ['a', 'b'],
        },
      ],
      [
        {
          type: 'order:changed',
          previousOrderedIds: ['a', 'b'],
          orderedIds: ['b', 'a'],
        },
      ],
      // unregister 时：
      // - 必然 ['item:unregistered', 'order:changed']
      // - 且 orderedIds 必然删除内容
      // - 且 previousOrderedIds 与 orderedIds 的差集必然为 'item:unregistered' 的 id
      [
        { type: 'item:unregistered', id: 'b', item: second },
        {
          type: 'order:changed',
          previousOrderedIds: ['b', 'a'],
          orderedIds: ['a'],
        },
      ],
    ])
    expect(Object.isFrozen(calls[0])).toBe(true)
  })

  it('重复取消订阅不会影响后续通知', () => {
    const controller = createCollectionController<TestItem>()
    const calls: string[][] = []
    const unsubscribe = controller.subscribe((notify) => {
      calls.push([...notify.snapshot.orderedIds])
    })

    unsubscribe()
    unsubscribe()
    controller.register({ id: 'a', data: { label: 'A' } })

    expect(calls).toEqual([])
  })

  it('无 snapshot 变化时不会只为了操作来源通知', () => {
    const controller = createCollectionController<TestItem>()
    const calls: CollectionOperationType[] = []
    const item = { id: 'a', data: { label: 'A' } }

    controller.subscribe((notify) => {
      if (notify.operation) calls.push(notify.operation)
    })

    controller.register(item)
    controller.update('a', (current) => current)
    controller.setOrder(['a'])
    controller.clearOrder()
    controller.update('missing', { data: { label: 'missing' } })

    expect(calls).toEqual(['register'])
  })

  it('订阅回调内触发更新时会先完成当前快照通知', () => {
    const controller = createCollectionController<TestItem>()
    const calls: Array<[string, string[], string[] | null]> = []

    controller.subscribe((notify) => {
      const { snapshot } = notify
      calls.push([
        'first',
        [...snapshot.orderedIds],
        notify.previousSnapshot ? [...notify.previousSnapshot.orderedIds] : null,
      ])
      if (snapshot.orderedIds.length === 1) {
        controller.register({ id: 'b', data: { label: 'B' } })
      }
    })
    controller.subscribe((notify) => {
      calls.push([
        'second',
        [...notify.snapshot.orderedIds],
        notify.previousSnapshot ? [...notify.previousSnapshot.orderedIds] : null,
      ])
    })

    controller.register({ id: 'a', data: { label: 'A' } })

    expect(calls).toEqual([
      ['first', ['a'], []],
      ['second', ['a'], []],
      ['first', ['a', 'b'], ['a']],
      ['second', ['a', 'b'], ['a']],
    ])
  })

  it('拒绝空字符串 id', () => {
    const controller = createCollectionController<TestItem>()

    expect(() => controller.register({ id: '', data: { label: 'A' } })).toThrow(
      /non-empty string/,
    )
    expect(() => controller.get('')).toThrow(/non-empty string/)
    expect(() => controller.setOrder([''])).toThrow(/non-empty string/)
  })
})
