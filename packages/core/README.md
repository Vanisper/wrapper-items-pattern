# @wrapper-items/core

框架无关的 item 集合与顺序管理 primitive。

它用于支撑 wrapper/items 组件模式中的基础 collection/order 能力，例如 Tabs、Carousel、Stepper、SegmentedControl、Accordion、Menu、Wizard 等组件都可以在其上组合自己的 UI 行为。

## 安装

```bash
pnpm add @wrapper-items/core
```

## 创建控制器

```ts
import { createCollectionController } from '@wrapper-items/core'

interface Item {
  id: string
  data: {
    label: string
  }
}

const controller = createCollectionController<Item>()
```

`Item` 至少需要包含稳定的字符串 `id`。`data` 会作为不透明数据随 item 保留在 snapshot 中。

## 注册与读取

```ts
const first = { id: 'a', data: { label: 'A' } }
const second = { id: 'b', data: { label: 'B' } }

controller.register(first)
controller.register(second)

controller.get('a')
// first

controller.getSnapshot().items
// [first, second]
```

相同 id 再次注册会替换原 item，但不会改变它在当前顺序中的位置。

## 顺序

默认情况下，`orderedItems` 使用注册顺序。调用 `setOrder(ids)` 可以设置逻辑顺序：

```ts
const third = { id: 'c', data: { label: 'C' } }

controller.register(third)
controller.setOrder(['c', 'a'])

controller.getSnapshot().orderedIds
// ['c', 'a', 'b']
```

`setOrder(ids)` 会对传入顺序做归一化：

- 只采纳已注册 id
- 重复 id 只保留第一次出现的位置
- 未传入的已注册 item 会按注册顺序追加到末尾

调用 `clearOrder()` 会清除传入顺序，`orderedItems` 恢复为注册顺序。

## Snapshot

`getSnapshot()` 返回不可变容器：

```ts
const snapshot = controller.getSnapshot()

snapshot.items
snapshot.orderedIds
snapshot.orderedItems
```

- `items` 保留注册顺序。
- `orderedIds` 是当前逻辑顺序对应的 id。
- `orderedItems` 是当前逻辑顺序对应的 item。

snapshot 对象和其中的数组会被冻结，但 item 本身不会被冻结。

## 单个 item 的位置

```ts
controller.getItemSnapshot('a')
// {
//   id: 'a',
//   item,
//   index: 0,
//   isFirst: true,
//   isLast: false,
// }
```

`index`、`isFirst`、`isLast` 都基于 `orderedItems` 计算。

## 更新与注销

```ts
controller.update('a', { data: { label: 'AA' } })

controller.update('a', (item) => ({
  ...item,
  data: { label: 'AAA' },
}))

controller.unregister('a')
```

对象形式的 `update` 会浅合并到当前 item。函数形式需要返回完整 item，并且不允许改变 id。

## 订阅

```ts
const unsubscribe = controller.subscribe((snapshot) => {
  console.log(snapshot.orderedIds)
})

unsubscribe()
```

只有 snapshot 内容实际变化时才会触发 listener。传入 `{ immediate: true }` 可以在订阅后立即收到当前 snapshot。

listener 内部再次触发更新时，控制器会先完成当前 snapshot 的所有 listener 通知，再派发新 snapshot。这样同一轮通知中的 listener 会看到同一个 snapshot。

## 设计边界

wrapper/items 组件场景通常还会存在 active、selected、focused、visible、multi-selection、keyboard navigation 等 UI 行为。不同组件对这些行为的语义和策略并不一致，所以它们不进入 collection/order 基础层。

这类 UI 行为适合由具体组件、使用方或可组合行为模块基于 collection/order snapshot 实现。
