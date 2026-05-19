<script setup lang="ts">
import type { OrderRegistryScheduler } from '@wrapper-items/lib'
import { provideCollection } from './_Context'
import { provideCollectionOrder } from './_OrderRegistry'

const props = withDefaults(
  defineProps<{
    /**
     * 延迟同步渲染顺序的时间
     *
     * @description 用于观察 item 注册完成到逻辑顺序修正之间的过渡状态
     */
    readonly orderSyncDelay?: number
  }>(),
  {
    orderSyncDelay: 0,
  },
)

const { controller, snapshot } = provideCollection()

provideCollectionOrder(
  (ids) => {
    controller.setOrder(ids)
  },
  {
    scheduler: createOrderSyncScheduler(props.orderSyncDelay),
  },
)

defineExpose({ controller, snapshot })

function createOrderSyncScheduler(delay: number): OrderRegistryScheduler {
  if (delay <= 0) return queueMicrotask

  return (flush) => {
    window.setTimeout(flush, delay)
  }
}
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
