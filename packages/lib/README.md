# @wrapper-items/lib

面向 wrapper/items 组件模式的通用 headless 工具。

## Order Registry

`createOrderRegistry` 用于记录子项 id 与外部声明顺序之间的关系，并把排序后的 ids 交给调用方提供的 handler。

```ts
import { createOrderRegistry } from '@wrapper-items/lib'

const registry = createOrderRegistry((orderedIds) => {
  controller.setOrder(orderedIds)
})

registry.set('intro', 0)
registry.set('edge', 2)
registry.set('usage', 1)
```

同一轮同步调用中的多次登记会被合并到一个 microtask 中，handler 最终收到：

```ts
['intro', 'usage', 'edge']
```

这个工具不依赖 `@wrapper-items/core`。它只负责根据登记的顺序产出 `orderedIds`，调用方可以自行决定如何消费这组 id。
