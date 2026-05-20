# wrapper-items-pattern

面向 wrapper/items 组件模式的 headless 基础能力。

`@wrapper-items/core` 提供框架无关的 item 集合与顺序管理。它适合用作 Tabs、Carousel、Stepper、SegmentedControl、Accordion、Menu、Wizard 等组件的底层 collection/order primitive。

`@wrapper-items/lib` 提供不绑定框架和 controller 的通用组合工具，例如根据外部声明顺序产出 `orderedIds` 的 order registry。

`@wrapper-items/vue` 提供 Vue 3 composables，把 core controller 接入 provide/inject、生命周期和响应式 snapshot，并提供 Vue wrapper/items 场景中的顺序登记能力。

## 安装

```bash
pnpm add @wrapper-items/core

# 使用通用组合工具时
pnpm add @wrapper-items/lib

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

type TabData = TabItem['data']

const controller = createCollectionController<TabData, TabItem>()

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

- `items` 保留注册顺序
- `orderedIds` 是当前逻辑顺序对应的 id
- `orderedItems` 是当前逻辑顺序对应的 item

`register` 只用于注册新的 item。同一个 id 重复注册会抛出错误，如需修改已注册 item 应该使用 `update`。

```ts
controller.update('a', (item) => ({
  ...item,
  data: { label: 'AA' },
}))
```

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
const unsubscribe = controller.subscribe((notify) => {
  console.log(notify.snapshot.orderedIds)
})

controller.register({ id: 'a', data: { label: 'A' } })

unsubscribe()
```

只有 snapshot 内容实际变化时才会触发订阅回调。回调收到的是 `CollectionNotify`，其中的 `operation` 是本次 snapshot 变化对应的 controller 操作来源，`snapshot` 是本次通知对应的最新快照，`previousSnapshot` 是本次通知前的快照，`changes` 是本次已提交的 collection/order 变化记录。传入 `{ immediate: true }` 可以在订阅后立即收到当前快照通知，此时 `operation` 和 `previousSnapshot` 为 `null`，`changes` 为空数组。

`operation` 描述的是触发本次 snapshot 变化的 core 方法，例如 `register`、`update`、`unregister`、`setOrder`、`clearOrder` 和 `clear`。`changes` 描述的是 core 已经提交的状态事实，例如 item 注册、更新、注销和逻辑顺序变化，不用于派发自定义事件。

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

type TabData = TabItem['data']

const tabs = createCollectionContext<TabData, TabItem>()
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

显式顺序场景可以创建 order context。子项注册后把自身 id 和组件层声明的 order 登记进去，父级消费排序后的 ids 并同步到 controller：

```ts
import {
  createCollectionContext,
  createExplicitOrderContext,
  useExplicitItemOrder,
} from '@wrapper-items/vue'

const tabs = createCollectionContext<TabData, TabItem>()
const tabOrder = createExplicitOrderContext()

const { controller } = tabs.provideCollection()

tabOrder.provideExplicitOrder((ids) => {
  controller.setOrder(ids)
})

const item = tabs.useCollectionItem({
  id: 'home',
  data: { label: 'Home' },
})

useExplicitItemOrder(
  tabOrder.useExplicitOrder(),
  () => item.itemSnapshot.value?.id,
  () => props.order,
)
```

这种模式适合组件层能明确拿到顺序值的场景。它不依赖 DOM 顺序，也不把 active、focus 等 UI 行为放进基础 collection。

渲染顺序场景可以使用 `createRenderedOrderContext`。子项登记自身 id 后，父级根据当前 Vue 渲染子树中已登记子项组件实例的出现顺序同步 ids：

```ts
import {
  createCollectionContext,
  createRenderedOrderContext,
  useRenderedItemOrder,
} from '@wrapper-items/vue'

const tabs = createCollectionContext<TabData, TabItem>()
const tabOrder = createRenderedOrderContext()

const { controller } = tabs.provideCollection()

tabOrder.provideRenderedOrder((ids) => {
  controller.setOrder(ids)
})

const item = tabs.useCollectionItem({
  id: 'home',
  data: { label: 'Home' },
})

useRenderedItemOrder(
  tabOrder.useRenderedOrder(),
  () => item.itemSnapshot.value?.id,
)
```

这种模式适合异步子项注册、slot 包装等导致注册时机和视觉顺序可能不一致的场景。它使用组件实例作为身份标记，但不会按 `uid` 数值排序。

## 设计边界

wrapper/items 组件场景通常还会存在 active、selected、focused、visible、multi-selection、keyboard navigation 等 UI 行为。不同组件对这些行为的语义和策略并不一致，所以它们不进入 collection/order 基础层。

这类 UI 行为适合由具体组件、使用方或可组合行为模块基于 collection/order snapshot 实现。

## 开发

```bash
pnpm test
pnpm typecheck
pnpm build
```
