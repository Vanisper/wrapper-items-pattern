# @wrapper-items/vue

Vue 3 composables for `@wrapper-items/core`.

它把 collection/order controller 接入 Vue 的 provide/inject、生命周期和响应式系统，适合在 Tabs、Carousel、Stepper、SegmentedControl、Accordion、Menu、Wizard 等 wrapper/items 组件中复用基础集合与顺序能力。

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

const tabs = createCollectionContext<TabItem>()
```

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

const controller = createCollectionController<TabItem>()

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

## 设计边界

`@wrapper-items/vue` 只负责把 collection/order primitive 接入 Vue。active、selected、focused、visible、multi-selection、keyboard navigation 等 UI 行为仍然由具体组件、使用方或独立组合模块实现。

当前版本不处理 slot/VNode 顺序校正。Vue compound children 场景如果需要严格贴合渲染顺序，后续可以在 adapter 层补充类似 `useOrderedChildren` 的顺序校正能力。
