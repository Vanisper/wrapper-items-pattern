# @wrapper-items/vue

Vue 3 composables for wrapper/items collection and order primitives.

它把 collection/order controller 接入 Vue 的 provide/inject、生命周期和响应式系统，也提供 Vue 场景下的顺序登记组合能力，适合在 Tabs、Carousel、Stepper、SegmentedControl、Accordion、Menu、Wizard 等 wrapper/items 组件中复用基础集合与顺序能力。

## 安装

```bash
pnpm add @wrapper-items/vue @wrapper-items/core vue
```

## 创建上下文

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

`createCollectionContext` 的第一个泛型是 `data` 类型，第二个泛型是完整 item 类型，第二个泛型默认是 `CollectionItem<TData>`。

建议为每类 item 创建独立 context，这样 `provide` 和 `inject` 会保留准确类型。

## 父级 provide

```ts
const { controller, snapshot } = tabs.provideCollection()

controller.setOrder(['settings', 'home'])

snapshot.value.orderedIds
```

`snapshot` 是 Vue shallow readonly ref。controller 内部 snapshot 变化时，它会同步更新。

也可以传入外部创建的 core controller：

```ts
import { createCollectionController } from '@wrapper-items/core'

const controller = createCollectionController<TabData, TabItem>()

tabs.provideCollection({ controller })
```

## 子项注册

```ts
const item = tabs.useCollectionItem({
  id: 'home',
  data: { label: 'Home' },
})

item.index.value
item.isFirst.value
item.isLast.value
```

`id` 和 `data` 支持普通值、ref 或 getter。子项所在 scope dispose 时会自动注销。

同一 collection 中，`useCollectionItem` 不能注册已经被其他 item 占用的 id。如果响应式 id 变化到已被占用的 id，会抛出错误，并保留原注册项。

如果 item 除了 `id`、`data` 以外还有额外字段，使用完整 item 注册：

```ts
tabs.useCollectionItem({
  item: () => ({
    id: props.name,
    data: { label: props.label },
    disabled: props.disabled,
  }),
})
```

当 id 变化时，旧 item 会先注销，再注册新 item。

## 数据驱动 items

```ts
const items = computed(() => [
  { id: 'home', data: { label: 'Home' } },
  { id: 'settings', data: { label: 'Settings' } },
])

const { snapshot } = tabs.useCollectionItems({ items })

snapshot.value.orderedIds
// ['home', 'settings']
```

`useCollectionItems` 会根据传入列表同步注册项，并把列表顺序同步为 collection 的逻辑顺序。列表中消失的 item 会被注销。

## 显式顺序

如果子项的渲染顺序由组件层明确提供，可以使用显式顺序上下文把 `id` 与 `order` 登记起来，再由父级把排序后的 ids 同步给 core controller。

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

`useExplicitItemOrder` 中的 id 可以是 `undefined`。这通常表示子项还没有成功进入 collection，此时它不会进入顺序队列。

调试异步注册或顺序修正过程时，可以通过 scheduler 延迟同步：

```ts
import { createDelayedOrderScheduler } from '@wrapper-items/vue'

tabOrder.provideExplicitOrder(
  (ids) => {
    controller.setOrder(ids)
  },
  {
    scheduler: createDelayedOrderScheduler(1000),
  },
)
```

## 设计边界

`@wrapper-items/vue` 负责把 collection/order primitive 接入 Vue，并提供这类 primitive 在 Vue wrapper/items 场景中的组合实现。active、selected、focused、visible、multi-selection、keyboard navigation 等 UI 行为仍然由具体组件、使用方或独立组合模块实现。

当前版本不处理 slot/VNode 顺序校正。Vue compound children 场景如果需要严格贴合渲染顺序，后续可以在 adapter 层补充类似 `useOrderedChildren` 的顺序校正能力。
