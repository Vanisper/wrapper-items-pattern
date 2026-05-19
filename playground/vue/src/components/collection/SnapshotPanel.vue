<script setup lang="ts" generic="U, T extends CollectionItem<U>">
import type { CollectionItem, CollectionSnapshot } from '@wrapper-items/core';
import { computed } from 'vue'

const snapshot = defineModel<CollectionSnapshot<U, T>>()

const registeredItems = computed(() => snapshot.value?.items)
const orderedIdsText = computed(() => snapshot.value?.orderedIds.join(' / '))
const registeredIdsText = computed(() =>
  snapshot.value?.items.map((item) => item.id).join(' / '),
)
const metrics = computed(() => [
  {
    label: 'registered',
    value: snapshot.value?.items.length,
  },
  {
    label: 'ordered',
    value: snapshot.value?.orderedItems.length,
  },
])
</script>

<template>
  <aside class="snapshot-panel">
    <div class="metric-grid">
      <div v-for="metric in metrics" :key="metric.label" class="metric">
        <span class="metric-label">{{ metric.label }}</span>
        <strong class="metric-value">{{ metric.value }}</strong>
      </div>
    </div>

    <div class="snapshot-block">
      <h2 class="snapshot-title">
        orderedIds
      </h2>
      <code class="snapshot-code">{{ orderedIdsText || 'empty' }}</code>
    </div>

    <div class="snapshot-block">
      <h2 class="snapshot-title">
        items
      </h2>
      <code class="snapshot-code">{{ registeredIdsText || 'empty' }}</code>
    </div>

    <ul class="registry-list" aria-label="registered item list">
      <li v-for="item in registeredItems" :key="item.id" class="registry-item">
        <slot name="item" :id="item.id" :data="item.data"></slot>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.snapshot-panel {
  display: grid;
  align-content: start;
  gap: 16px;
  border: 1px solid #dbe4f0;
  border-radius: 8px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 18px 48px rgba(35, 49, 75, 0.08);

  .metric-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .metric,
  .snapshot-block {
    border: 1px solid #dbe4f0;
    border-radius: 8px;
    background: #f8fafc;
  }

  .metric {
    display: grid;
    gap: 8px;
    padding: 14px;
  }

  .metric-label {
    color: #66758f;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .metric-value {
    color: #172033;
    font-size: 28px;
    line-height: 1;
  }

  .snapshot-block {
    display: grid;
    gap: 10px;
    padding: 14px;
  }

  .snapshot-title {
    margin: 0;
    color: #172033;
    font-size: 14px;
    line-height: 1.2;
  }

  .snapshot-code {
    display: block;
    overflow-x: auto;
    color: #0f5132;
    font-size: 13px;
    line-height: 1.5;
    white-space: nowrap;
  }

  .registry-list {
    display: grid;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .registry-item {
    display: grid;
    grid-template-columns: 10px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    min-height: 34px;
    color: #344258;
    font-size: 14px;
  }
}
</style>
