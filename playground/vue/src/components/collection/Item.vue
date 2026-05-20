<script setup lang="ts" generic="U, T extends CollectionItem<U>">
import { computed } from 'vue'
import { Trash2 } from '@lucide/vue'
import type { CollectionItem } from '@wrapper-items/core'
import { useOrderedCollectionItem } from './_OrderContext'
import type { CollectionOrderMode } from './_OrderContext'

const props = defineProps<{
  readonly item: T
  readonly order: number
  readonly orderMode: CollectionOrderMode
}>()

const emit = defineEmits<{
  remove: [id: string]
}>()

defineSlots<{
  default(props: {
    order: number
    id: T['id']
    data: T['data']
  }): any
}>()

const { index } = useOrderedCollectionItem<U, T>({
  item: () => props.item,
  order: () => props.order,
  orderMode: () => props.orderMode,
})

const displayIndex = computed(() => (index.value >= 0 ? index.value + 1 : ''))
</script>

<template>
  <li class="item-row">
    <span class="item-index">{{ displayIndex }}</span>
    <span class="item-body">
      <slot :order="order" :id="item.id" :data="item.data"></slot>
    </span>
    <button
      class="item-action"
      type="button"
      :title="`移除 ${item.id}`"
      @click="emit('remove', item.id)"
    >
      <Trash2 :size="17" aria-hidden="true" />
    </button>
  </li>
</template>

<style lang="css" scoped>
.item-row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 40px;
  align-items: center;
  gap: 12px;
  min-height: 74px;
  border: 1px solid #dbe4f0;
  border-left-width: 5px;
  border-radius: 8px;
  padding: 10px 12px;
  background: #fff;

  .item-index {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    color: #fff;
    background: #172033;
    font-weight: 800;
  }

  .item-body {
    display: grid;
    min-width: 0;
    gap: 4px;
  }

  .item-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: 1px solid #cdd7e5;
    border-radius: 8px;
    color: #24324a;
    background: #fff;
    cursor: pointer;
    transition:
      transform 140ms ease,
      border-color 140ms ease;

    &:hover {
      transform: translateY(-1px);
      border-color: #2563eb;
    }
  }
}

@media (max-width: 480px) {
  .item-row {
    grid-template-columns: 36px minmax(0, 1fr) 36px;
    padding: 10px;

    .item-index,
    .item-action {
      width: 36px;
      height: 36px;
    }
  }
}
</style>
