<script setup lang="ts">
import { createDelayedOrderScheduler } from '@wrapper-items/vue'
import { provideCollection } from './_Context'
import { provideCollectionOrder } from './_OrderContext'
import type { CollectionOrderMode } from './_OrderContext'

const props = withDefaults(
  defineProps<{
    /**
     * 当前使用的顺序内核
     */
    readonly orderMode?: CollectionOrderMode

    /**
     * 延迟同步渲染顺序的时间
     *
     * @description 用于观察 item 注册完成到逻辑顺序修正之间的过渡状态
     */
    readonly orderSyncDelay?: number
  }>(),
  {
    orderMode: 'rendered',
    orderSyncDelay: 0,
  },
)

const { controller, snapshot } = provideCollection()

provideCollectionOrder(
  (ids) => {
    controller.setOrder(ids)
  },
  {
    mode: () => props.orderMode,
    scheduler: createDelayedOrderScheduler(props.orderSyncDelay),
  },
)

defineExpose({ controller, snapshot })
</script>

<template>
  <section class="workspace" aria-label="collection snapshot">
    <slot />
  </section>
</template>

<style scoped>
.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.8fr);
  gap: 18px;
}

@media (max-width: 820px) {
  .workspace {
    grid-template-columns: 1fr;
  }
}
</style>
