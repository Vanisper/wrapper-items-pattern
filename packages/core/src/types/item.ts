/** item 的唯一标识 */
export type ItemId = string

/**
 * collection 中的最小 item 结构
 *
 * @description data 会作为不透明数据随 item 保留在 snapshot 中
 */
export interface CollectionItem<TData = unknown> {
  /** 用作 item 身份的稳定 id */
  id: ItemId

  /** 业务侧附加数据 */
  data?: TData
}
