# Wrapper Items Pattern 研究与设计札记

## 目标理解

这个项目要抽象的不是某一个 Tabs、Carousel 或 Swiper 组件，而是一类父容器与子项协同的 headless 行为协议：

- 父容器知道有哪些子项。
- 父容器知道子项的逻辑顺序。
- 父容器能把子项集合与顺序暴露给上层行为。
- 子项能注册自己，并获得自己的集合派生信息，例如 index、first、last。
- 框架适配层负责把这套协议接到 React/Vue 的 children、slot、生命周期和响应式模型上。

这类协议可以支撑 Tabs、Carousel、Stepper、SegmentedControl、Accordion、Menu、Wizard 等组件族。核心价值是把“子项集合管理”从具体 UI 组件里剥离出来。

这些组件场景一般还会包含 active、selected、focused、visible、multi-selection、keyboard navigation 等 UI 行为。例如 Swiper 需要处理 active slide、visible slide、循环切换和导航，Tabs 需要处理 active tab、焦点与键盘访问，Menu/Listbox 又会引入完全不同的选择与焦点策略。

也正因为这些行为来自具体 UI 场景，它们不适合直接进入 collection/order 基础层。基础控制器应先稳定表达 item 集合与顺序；active、focus、多选、键盘导航等行为更适合作为组合模块，或由用户在业务/组件层自己实现。

## 参考对象

- Swiper React/Vue wrapper 与 core slide 机制
- Ant Design Tabs 与 rc-tabs
- Element Plus Carousel 与 `useOrderedChildren`

## Swiper 观察

Swiper 的模式是“强核心实例 + 薄框架包装”。

React/Vue 组件都做类似的事：

- 从 children/slots 中识别出 slide，并把非 slide 内容放进预定义 slot 区域。
- 创建 `SwiperCore` 实例。
- 在挂载阶段把 DOM 节点、navigation、pagination、scrollbar 等真实元素交给核心实例。
- 在更新阶段 diff props/slides，再调用共享的 `updateSwiper()`。
- 子项不拥有整体状态，只订阅核心实例派发的 slide class 变化，并派生 `isActive`、`isPrev`、`isNext`、`isVisible` 等数据。

可借鉴点：

- 核心行为和框架渲染明确分离，React/Vue adapter 不重新实现 slide 逻辑。
- children/slots 提取是框架适配层责任，不应放入 framework-agnostic core。
- 子项状态可以通过 context/provide 暴露给 render prop 或 slot props。
- mount 与 update 分开，避免初始化逻辑和响应更新逻辑混在一起。
- active 切换不是简单 `index + 1`，还要处理 loop、rewind、disabled/locked、动画中禁止切换等策略。

对本项目的启发：

- core 管理集合与顺序，不碰 DOM，也不预设选择/导航语义。
- adapter 可以提供“数据驱动 items 模式”和“子项注册模式”两套入口。
- item 的集合派生状态应由 store 统一计算，避免每个 adapter 自己散写 index/first/last 这类基础信息。

## Ant Design Tabs / rc-tabs 观察

Ant Design 自己的 Tabs 主要是品牌包装和兼容层，核心逻辑在 `rc-tabs`。

关键模式：

- `items` 是当前主模型，旧的 `Tabs.TabPane` children 会被转换成 items，并给出弃用提示。
- active 状态使用 `activeKey/defaultActiveKey`，不是 index。这样重排、插入、删除时更稳定。
- activeKey 支持 controlled/uncontrolled。内部通过受控状态 hook 合并外部 `activeKey` 与内部默认值。
- 如果当前 activeKey 对应的 tab 被删除，会按旧 activeIndex 夹取到新的合法范围。
- Nav 和 Panel 是分离的：`TabNavList` 管导航、测量、键盘、溢出；`TabPanelList` 管面板渲染、隐藏和销毁。
- 可访问性很完整：`role="tablist"`、`role="tab"`、`role="tabpanel"`、`aria-controls`、`aria-labelledby`、方向键、Home/End、Enter/Space 等。
- overflow 是独立问题：测量 tab 尺寸、计算可见范围，把隐藏 tab 放进 operation dropdown。

可借鉴点：

- public API 应该优先支持数据驱动 `items`，children/compound 作为 adapter 能力或兼容能力。
- core 中应优先使用稳定 key，而不是把 index 当成唯一身份。
- 如果实现选择行为模块或具体 Tabs，active key 删除后的 fallback 策略需要明确；这不属于基础 collection/order core。
- disabled item、destroyOnHidden、forceRender、keyboard focus 都是 Tabs 这类组件自然需要的行为，但可以设计为可选策略。
- overflow/indicator/ink bar 属于 UI 层，不要进入 core；基础 core 只需要提供 collection/order。

对本项目的启发：

- 如果提供选择模块，`activeId` 应优先于 `activeIndex`，后者只是派生值。
- `select(id)`、`selectAt(index)`、`next()`、`prev()`、跳过 disabled 等应放在可组合的选择/导航行为中。
- adapter 层应该能把 items 转换成统一 item registry，不强迫所有组件都用子组件注册。

## Element Plus Carousel 观察

Element Plus Carousel 是典型 Vue provide/inject + 子项注册模型。

关键模式：

- 父组件 `useCarousel()` 使用 `useOrderedChildren()` 管理子项。
- 子项 `useCarouselItem()` 在 setup 中注入父 context，并调用 `addItem()` 注册，卸载前 `removeItem()`。
- 每个 item context 包含 `uid`、`props`、`states`、`getVnode()`、`translateItem()`。
- `useOrderedChildren()` 不只按注册顺序排列；它会读取父组件 subTree，扁平化 VNode，再按真实 VNode 顺序排序。
- 为处理 Vue 重排，它还劫持父 DOM 的 `insertBefore`，在相关节点移动时触发 children 重新排序。
- Carousel 的 active 切换支持 index/name、loop 边界、autoplay、hover pause、resize 后重新计算位置。
- 每个 item 自己计算 transform、active、inStage、animating 等显示状态，父组件通过 `resetItemPosition()` 广播 active 变化。

可借鉴点：

- Vue slot 顺序不能只靠注册顺序，尤其有 `v-for`、条件渲染、fragment、transition 时。
- 子项需要一个稳定内部 uid，也需要一个可选 public key/name。
- `ChildrenSorter` 这类渲染时排序触发器很适合 Vue adapter。
- 父组件不应该直接扫描 DOM 才知道子项是谁；子项注册仍然是主路径，VNode/DOM 只用于排序校正。

对本项目的启发：

- Vue adapter 需要重点处理 slot/VNode 顺序，`useOrderedChildren` 是可借鉴路线。
- core 可以不知道 Vue uid，但 adapter 应把 uid/public key 映射成 core item id。
- item-local state 和 core-global state 要分清：比如 carousel transform 属于具体组件逻辑，不应进入通用 core。

## Core 设计方向

Core 是纯 TypeScript，不依赖 React/Vue/DOM。

基础 core 对外暴露 collection/order controller。内部可以拆分注册、顺序归一化、快照生成等模块，但这些拆分不构成额外公开模型。

collection/order controller 负责：

- 管理 item 的注册、注销、更新。
- 使用稳定 `id` 表达 item 身份。
- 将 `data` 作为不透明数据随 item 保留。
- 默认按注册顺序生成 orderedItems。
- 接收外部顺序，并过滤未知 id、去除重复 id。
- 将未出现在外部顺序中的已注册 item 追加到末尾。
- 提供不可变 snapshot 和 snapshot 订阅。

active、focus、多选等 UI 行为不作为当前 core 的设计目标。它们只保留组合原则：如果具体组件或使用方需要，应作为独立行为与 collection/order snapshot 组合，而不是反向扩大基础 item 模型。

状态以 id 为主：

```ts
type ItemId = string

interface CollectionItem<TData = unknown> {
  id: ItemId
  data?: TData
}

interface CollectionSnapshot<TItem extends CollectionItem = CollectionItem> {
  items: readonly TItem[]
  orderedIds: readonly ItemId[]
  orderedItems: readonly TItem[]
}
```

`symbol` 不作为 public id。React key、DOM attribute、Vue name、SSR 序列化都更适合 string。内部 uid 可以由 adapter 自己维护。

## React adapter 设计方向

React adapter 可以评估两类入口：

- `useCollectionItems({ items })`
  - 数据驱动模式，类似 rc-tabs
  - 适合 Tabs、SegmentedControl、Stepper
- `CollectionProvider` + `useCollectionItem({ id, data })`
  - compound children 模式
  - 适合自定义子组件主动注册

需要避免的问题：

- Hook 创建的 controller 和 `<Wrapper>` 内部 provider 不能是两套状态。
- 如果提供 compound children 模式，需要正式暴露 Context 或 Provider 组件。
- 子项注册应在 layout effect 中完成，并处理 id/data 变化。
- `useSyncExternalStore` 应订阅 collection/order snapshot，避免状态撕裂。

## Vue adapter 设计方向

Vue adapter 可以评估以下能力：

- `useCollectionItems(options)`：父组件组合式函数，创建 controller 并 provide。
- `useCollectionItem(options)`：子项注册/注销，返回 `index`、`isFirst`、`isLast` 等集合派生状态。
- `ChildrenSorter` 或 `useOrderedChildren` 风格的顺序校正：用于处理 slot/VNode 顺序。

需要避免的问题：

- 子项注册后要立即得到当前 collection/order snapshot。
- `orderedItems` 等应是 Vue ref/computed，不应返回普通快照。
- DOM order tracking 不应是唯一策略；Vue 更适合 VNode order + insertBefore 校正。

## 基础层职责

Core 负责：

- 子项身份
- 子项集合
- 顺序
- 状态变化订阅
- 注册、注销、更新、重排后的 collection/order 归一化

以下能力来自具体 UI 场景，不进入 collection/order 基础层：

- DOM 测量
- overflow dropdown
- indicator/ink-bar 动画
- carousel translate/scale
- autoplay timer
- active/focus/visible/multi-selection 等 UI 行为
- disabled、destroyOnHidden、keyboard navigation 等具体组件语义
- React/Vue 渲染细节
