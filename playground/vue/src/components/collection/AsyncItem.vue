<script setup lang="ts" generic="U, T extends CollectionItem<U>">
import { computed, onMounted, onScopeDispose, shallowRef, useAttrs } from 'vue'
import Item from './Item.vue'
import type { CollectionItem } from '@wrapper-items/core'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<{
  readonly item: T
  readonly order: number
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

const attrs = useAttrs()
const total = shallowRef(randomInteger(120, 520))
const progress = shallowRef(0)
const isLoaded = computed(() => progress.value >= total.value)
const progressPercent = computed(() =>
  Math.round((Math.min(progress.value, total.value) / total.value) * 100),
)

let timer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  tickProgress()
})

onScopeDispose(() => {
  if (timer) {
    clearTimeout(timer)
  }
})

function tickProgress(): void {
  if (isLoaded.value) return

  progress.value = Math.min(
    total.value,
    progress.value + randomInteger(6, 28),
  )

  timer = setTimeout(tickProgress, randomInteger(80, 220))
}

function randomInteger(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
</script>

<template>
  <Item
    v-if="isLoaded"
    v-bind="attrs"
    :item="item"
    :order="order"
    @remove="emit('remove', $event)"
  >
    <template #default="slotProps">
      <slot
        :order="slotProps.order"
        :id="slotProps.id"
        :data="slotProps.data"
      ></slot>
    </template>
  </Item>

  <li v-else v-bind="attrs" class="async-item-row">
    <span class="async-item-index">{{ order + 1 }}</span>
    <span class="async-item-body">
      <strong class="async-item-title">{{ item.id }}</strong>
      <span class="async-item-progress">
        <span class="async-item-progress-track">
          <span
            class="async-item-progress-bar"
            :style="{ width: `${progressPercent}%` }"
          ></span>
        </span>
        <span class="async-item-progress-text">
          {{ progress }}/{{ total }}
        </span>
      </span>
    </span>
    <span class="async-item-state">{{ progressPercent }}%</span>
  </li>
</template>

<style scoped>
.async-item-row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 54px;
  align-items: center;
  gap: 12px;
  min-height: 74px;
  border: 1px solid #dbe4f0;
  border-left-width: 5px;
  border-radius: 8px;
  padding: 10px 12px;
  background:
    linear-gradient(90deg, rgba(248, 250, 252, 0.92), rgba(255, 255, 255, 0.96));

  .async-item-index {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    color: #526178;
    background: #e8edf5;
    font-weight: 800;
  }

  .async-item-body {
    display: grid;
    min-width: 0;
    gap: 8px;
  }

  .async-item-title {
    overflow: hidden;
    color: #344258;
    font-size: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .async-item-progress {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
  }

  .async-item-progress-track {
    overflow: hidden;
    height: 8px;
    border-radius: 999px;
    background: #dbe4f0;
  }

  .async-item-progress-bar {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: #2563eb;
    transition: width 120ms ease;
  }

  .async-item-progress-text,
  .async-item-state {
    color: #66758f;
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
  }
}

@media (max-width: 480px) {
  .async-item-row {
    grid-template-columns: 36px minmax(0, 1fr) 48px;
    padding: 10px;

    .async-item-index {
      width: 36px;
      height: 36px;
    }
  }
}
</style>
