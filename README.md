# wrapper-items-pattern

面向 wrapper/items 组件模式的 headless 基础能力。

`@wrapper-items/core` 提供框架无关的 item 集合与顺序管理。它适合用作 Tabs、Carousel、Stepper、SegmentedControl、Accordion、Menu、Wizard 等组件的底层 collection/order primitive。

`@wrapper-items/vue` 提供 Vue 3 composables，把 core controller 接入 provide/inject、生命周期和响应式 snapshot。

## 安装

```bash
pnpm add @wrapper-items/core

# 使用 Vue adapter 时
pnpm add @wrapper-items/vue @wrapper-items/core vue
```

## 快速开始

```ts
import { createCollectionController } from '@wrapper-items/core'

interface TabItem {
  id: string
  data: {
    label: string
  }
}

const controller = createCollectionController<TabItem>()

const first = { id: 'a', data: { label: 'A' } }
const second = { id: 'b', data: { label: 'B' } }
const third = { id: 'c', data: { label: 'C' } }

controller.register(first)
controller.register(second)
controller.register(third)

controller.setOrder(['c', 'a'])

controller.getSnapshot().orderedIds
// ['c', 'a', 'b']
```

`setOrder(['c', 'a'])` 只会调整已注册 item 的逻辑顺序。未传入的已注册 item 会按注册顺序追加到末尾，所以示例中的 `b` 会保留在最后。

## Snapshot

`getSnapshot()` 返回只读快照：

```ts
const snapshot = controller.getSnapshot()

snapshot.items
snapshot.orderedIds
snapshot.orderedItems
```

- `items` 保留注册顺序。
- `orderedIds` 是当前逻辑顺序对应的 id。
- `orderedItems` 是当前逻辑顺序对应的 item。

同一个 id 再次注册会替换 item，但不会改变它在当前逻辑顺序中的位置。

## 顺序规则

`setOrder(ids)` 会对传入顺序做归一化：

- 只采纳已注册 id
- 重复 id 只保留第一次出现的位置
- 未传入的已注册 item 会按注册顺序追加到末尾

```ts
controller.setOrder(['c', 'missing', 'a', 'c'])

controller.getSnapshot().orderedIds
// ['c', 'a', 'b']
```

调用 `clearOrder()` 会清除传入顺序，`orderedItems` 恢复为注册顺序。

## 订阅变化

```ts
const unsubscribe = controller.subscribe((snapshot) => {
  console.log(snapshot.orderedIds)
})

controller.register({ id: 'a', data: { label: 'A' } })

unsubscribe()
```

只有 snapshot 内容实际变化时才会触发订阅回调。传入 `{ immediate: true }` 可以在订阅后立即收到当前快照。

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

## Vue adapter

```ts
import { createCollectionContext } from '@wrapper-items/vue'

interface TabItem {
  id: string
  data: {
    label: string
  }
}

const tabs = createCollectionContext<TabItem>()
```

父级创建并提供 collection：

```ts
const { controller, snapshot } = tabs.provideCollection()
```

子项注册自己：

```ts
const item = tabs.useCollectionItem({
  id: 'home',
  data: { label: 'Home' },
})

item.index.value
item.isFirst.value
item.isLast.value
```

数据驱动场景可以直接同步 items：

```ts
tabs.useCollectionItems({
  items: () => [
    { id: 'home', data: { label: 'Home' } },
    { id: 'settings', data: { label: 'Settings' } },
  ],
})
```

## 设计边界

wrapper/items 组件场景通常还会存在 active、selected、focused、visible、multi-selection、keyboard navigation 等 UI 行为。不同组件对这些行为的语义和策略并不一致，所以它们不进入 collection/order 基础层。

这类 UI 行为适合由具体组件、使用方或可组合行为模块基于 collection/order snapshot 实现。

## 开发

```bash
pnpm test
pnpm typecheck
pnpm build
```
