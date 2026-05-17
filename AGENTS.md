# AGENTS.md

## 项目定位

`wrapper-items-pattern` 提供面向 wrapper/items 组件模式的 headless 基础能力。

`@wrapper-items/core` 聚焦 item 集合与顺序管理：

- item 注册、更新、注销
- 注册顺序与逻辑顺序
- collection snapshot
- snapshot 订阅
- 注册、注销、重排后的 collection/order 归一化

wrapper/items 组件场景通常还会出现 active、selected、focused、visible、multi-selection、keyboard navigation 等 UI 行为。例如 Swiper 需要处理 active slide、visible slide、循环切换和导航，Tabs 需要处理 active tab、焦点与键盘访问。

这些 UI 行为的抽象不进入 collection/order 基础层。不同组件对同一个词的语义和策略并不一致，应由使用方、具体组件或可组合行为模块实现，避免基础控制器为了适配不确定场景而膨胀。

Markdown 文档是正常文章语境，应按内容结构使用中文标点。无序列表项如果是短语或词组，末尾不加标点；如果是完整句子或包含多个分句，末尾加句号。源码 JSDoc 中“不以句号结尾”的约定只适用于注释，不适用于 README、设计文档等 Markdown 正文。

## 注释风格

源码注释使用中文，除非引用外部 API 名称、协议名或代码术语。

中文 JSDoc 不按英文注释风格直译：

- 中文注释一般不以句号结尾。
- 多行说明中，摘要与补充说明之间保留一个空行，保证 JSDoc 渲染时换行。
- 需要补充说明时优先使用 `@description`。
- 多个要点可使用列表。
- `@example`、`@default`、`@deprecated` 等标签只在确实有价值时使用。

示例：

```ts
/**
 * 根据传入的 id 列表调整顺序
 *
 * @description 只调整已注册 item 的顺序，未传入的已注册 item 会保留在末尾
 */
setOrder(ids: readonly ItemId[]): void
```

如果说明较多：

```ts
/**
 * 根据传入的 id 列表调整顺序
 *
 * @description
 * - 只调整已注册 item 的顺序
 * - 未传入的已注册 item 会保留在末尾
 */
setOrder(ids: readonly ItemId[]): void
```

接口、类型、public 方法的注释优先级较高。内部实现只在存在非直观约束、边界或维护风险时加注释，避免复述代码。

公开 API 的 JSDoc 应面向三方使用者，说明参数、返回值、状态变化、失败条件、顺序规则等调用契约。架构取舍、模块边界、某个模块“不做什么”这类内容优先写入项目文档，不要混进用户会直接读到的类型注释。

如果文件顶部有文件级注释，并且第一个导出符号不应该继承这段说明，需要为第一个导出符号单独写 JSDoc，避免文档工具误挂注释。

## 测试要求

单元测试的 `describe`、`it` 标题使用中文，便于测试报告直接表达项目语义。API 名称、变量名、错误信息、正则断言等代码语义保持原样即可。

修改 TypeScript 源码、公开类型或单元测试后至少运行：

```bash
pnpm test
pnpm typecheck
```

涉及打包配置、package exports、依赖、构建产物入口或发布文件范围时再运行：

```bash
pnpm build
```
