<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import Toolbar from '../components/Toolbar.vue'

import AsyncItem from '../components/collection/AsyncItem.vue'
import ItemsWrapper from '../components/collection/ItemsWrapper.vue'
import SnapshotPanel from '../components/collection/SnapshotPanel.vue'

import {
  clonePlaygroundItems,
  createPlaygroundItem,
  initialPlaygroundItems,
  type PlaygroundCollectionItem,
} from '../core/collection-playground'
import type { CollectionSnapshot } from '@wrapper-items/core'
import type { CollectionOrderMode } from '../components/collection/index'

const wrapperRef = useTemplateRef('wrapperRef')

const snapshot = computed(() =>
  wrapperRef.value?.snapshot as CollectionSnapshot<PlaygroundCollectionItem['data']>
)

const items = shallowRef(clonePlaygroundItems(initialPlaygroundItems))
const nextItemIndex = shallowRef(initialPlaygroundItems.length + 1)
const orderMode = shallowRef<CollectionOrderMode>('rendered')

// 拉开 item 注册与顺序修正的时间差，便于观察异步注册下的排序过程
const orderSyncDelay = 1400

const canReorder = computed(() => items.value.length > 1)

function moveFirstToEnd(): void {
  const [first, ...rest] = items.value
  if (!first) return

  items.value = [...rest, first]
}

function reverseOrder(): void {
  items.value = [...items.value].reverse()
}

function addItem(): void {
  const index = nextItemIndex.value

  items.value = [...items.value, createPlaygroundItem(index)]
  nextItemIndex.value = index + 1
}

function removeItem(id: string): void {
  items.value = items.value.filter((item) => item.id !== id)
}

function resetItems(): void {
  items.value = clonePlaygroundItems(initialPlaygroundItems)
  nextItemIndex.value = initialPlaygroundItems.length + 1
}

function setOrderMode(mode: CollectionOrderMode): void {
  orderMode.value = mode
}
</script>

<template>
  <main class="collection-playground">
    <header class="playground-header">
      <div class="heading-group">
        <p class="eyebrow">
          @wrapper-items/vue
        </p>
        <h1 class="title">
          Collection Playground
        </h1>
      </div>

      <Toolbar :can-reorder="canReorder" @add="addItem" @move-first-to-end="moveFirstToEnd" @reset="resetItems"
        @reverse="reverseOrder" />
    </header>

    <ItemsWrapper
      ref="wrapperRef"
      :order-mode="orderMode"
      :order-sync-delay="orderSyncDelay"
    >
      <div class="ordered-panel">
        <div class="panel-header">
          <div>
            <p class="section-kicker">
              orderedItems
            </p>
            <h2 class="section-title">
              逻辑顺序
            </h2>
          </div>
          <div class="panel-controls" aria-label="顺序内核">
            <button
              class="mode-button"
              type="button"
              :aria-pressed="orderMode === 'rendered'"
              @click="setOrderMode('rendered')"
            >
              渲染顺序
            </button>
            <button
              class="mode-button"
              type="button"
              :aria-pressed="orderMode === 'explicit'"
              @click="setOrderMode('explicit')"
            >
              显式顺序
            </button>
            <span class="count-pill">{{ items.length }}</span>
          </div>
        </div>

        <ol class="ordered-list">
          <AsyncItem
            v-for="(item, index) in items"
            :key="item.id"
            :item="item"
            :order="index"
            :order-mode="orderMode"
            :class="`tone-${item.data.tone}`"
            @remove="removeItem"
          >
            <template #default="{ id, data }">
              <strong class="item-title">{{ data.title }}</strong>
              <span class="item-detail">
                {{ id }} · 视觉顺序 {{ index + 1 }} · {{ orderMode }} · {{ data.detail }}
              </span>
            </template>
          </AsyncItem>
        </ol>
      </div>

      <SnapshotPanel v-model="snapshot">
        <template #item="{ id, data }">
          <span class="registry-dot" :class="`tone-${data?.tone}`" />
          <span>{{ data?.title }}</span>
          <code>{{ id }}</code>
        </template>
      </SnapshotPanel>
    </ItemsWrapper>
  </main>
</template>

<style lang="css" scoped>
.collection-playground {
  width: min(1120px, calc(100vw - 40px));
  min-height: 100vh;
  margin: 0 auto;
  padding: 48px 0;

  .playground-header {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 24px;
  }

  .heading-group {
    display: grid;
    gap: 6px;
  }

  .eyebrow {
    margin: 0;
    color: #5f6f89;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .title {
    margin: 0;
    color: #172033;
    font-size: 36px;
    line-height: 1.1;
  }
}

@media (max-width: 820px) {
  .collection-playground {
    width: min(100vw - 24px, 640px);
    padding: 24px 0;

    .playground-header {
      align-items: stretch;
      flex-direction: column;
    }

    .title {
      font-size: 30px;
    }
  }
}
</style>

<style lang="css" scoped>
.ordered-panel {
  border: 1px solid #dbe4f0;
  border-radius: 8px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 18px 48px rgba(35, 49, 75, 0.08);

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }

  .section-kicker {
    margin: 0;
    color: #5f6f89;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .section-title {
    margin: 0;
    color: #172033;
    font-size: 22px;
    line-height: 1.2;
  }

  .panel-controls {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .mode-button {
    min-height: 32px;
    border: 1px solid #cdd7e5;
    border-radius: 8px;
    padding: 0 10px;
    color: #526178;
    background: #fff;
    font-weight: 800;
    cursor: pointer;

    &[aria-pressed="true"] {
      border-color: #2563eb;
      color: #1e3a8a;
      background: #dbeafe;
    }
  }

  .count-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    height: 28px;
    border-radius: 8px;
    color: #1e3a8a;
    background: #dbeafe;
    font-weight: 800;
  }

  .ordered-list {
    display: grid;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;

    .tone-blue {
      border-left-color: #2563eb;
    }
    .tone-green {
      border-left-color: #16a34a;
    }
    .tone-coral {
      border-left-color: #f97316;
    }
    .tone-gold {
      border-left-color: #ca8a04;
    }
  }
}

.registry-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;

  &.tone-blue {
    background: #2563eb;
  }
  &.tone-green {
    background: #16a34a;
  }
  &.tone-coral {
    background: #f97316;
  }
  &.tone-gold {
    background: #ca8a04;
  }
}

.item-title, .item-detail {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-title {
  color: #172033;
  font-size: 16px;
}

.item-detail {
  color: #66758f;
  font-size: 13px;
}
</style>
