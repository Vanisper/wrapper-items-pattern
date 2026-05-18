/** 订阅回调 */
export type Listener<TValue> = (value: TValue) => void

/** 取消订阅函数 */
export type Unsubscribe = () => void

/** 订阅选项 */
export interface SubscribeOptions {
  /** 订阅后是否立即收到当前快照 */
  immediate?: boolean
}
