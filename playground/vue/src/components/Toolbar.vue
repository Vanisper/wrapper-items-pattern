<script setup lang="ts">
import {
  ArrowDownUp,
  ListRestart,
  Plus,
  RotateCcw,
} from '@lucide/vue'

defineProps<{
  readonly canReorder: boolean
}>()

const emit = defineEmits<{
  add: []
  moveFirstToEnd: []
  reset: []
  reverse: []
}>()
</script>

<template>
  <div class="toolbar" aria-label="collection actions">
    <button class="tool-button primary" type="button" @click="emit('add')">
      <Plus :size="18" aria-hidden="true" />
      <span>新增</span>
    </button>
    <button
      class="tool-button"
      type="button"
      :disabled="!canReorder"
      @click="emit('moveFirstToEnd')"
    >
      <ArrowDownUp :size="18" aria-hidden="true" />
      <span>轮转</span>
    </button>
    <button
      class="tool-button"
      type="button"
      :disabled="!canReorder"
      @click="emit('reverse')"
    >
      <ListRestart :size="18" aria-hidden="true" />
      <span>反转</span>
    </button>
    <button
      class="icon-button"
      type="button"
      title="重置"
      @click="emit('reset')"
    >
      <RotateCcw :size="18" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;

  .tool-button,
  .icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #cdd7e5;
    color: #24324a;
    background: #fff;
    cursor: pointer;
    transition:
      transform 140ms ease,
      border-color 140ms ease,
      background-color 140ms ease;

    &:hover {
      transform: translateY(-1px);
      border-color: #2563eb;
    }
  }

  .tool-button {
    min-height: 40px;
    gap: 8px;
    border-radius: 8px;
    padding: 0 14px;
    font-weight: 700;

    &.primary {
      border-color: #2563eb;
      color: #fff;
      background: #2563eb;
    }

    &:disabled {
      color: #8a98ad;
      background: #f3f6fa;
      cursor: not-allowed;

      &:hover {
        transform: none;
        border-color: #cdd7e5;
      }
    }
  }

  .icon-button {
    width: 40px;
    height: 40px;
    border-radius: 8px;
  }
}

@media (max-width: 820px) {
  .toolbar {
    justify-content: flex-start;
  }
}

@media (max-width: 480px) {
  .toolbar {
    .tool-button {
      flex: 1 1 calc(50% - 8px);
    }

    .icon-button {
      width: 36px;
      height: 36px;
    }
  }
}
</style>
