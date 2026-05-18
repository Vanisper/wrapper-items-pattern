/**
 * 触发 snapshot 变化的 controller 操作类型
 *
 * @description 只有操作导致 snapshot 内容实际变化时，才会作为 notify.operation 派发给订阅者
 */
export type CollectionOperationType =
  | 'register'
  | 'update'
  | 'unregister'
  | 'setOrder'
  | 'clearOrder'
  | 'clear'
