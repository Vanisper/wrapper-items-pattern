<script setup lang="ts">
import {
  ArrowDownUp,
  ListRestart,
  Plus,
  RotateCcw,
  Trash2,
} from '@lucide/vue'
import { computed, shallowRef } from 'vue'
import { createCollectionContext } from '@wrapper-items/vue'

interface BoardItem {
  id: string
  data: {
    title: string
    detail: string
    tone: 'blue' | 'green' | 'coral' | 'gold'
  }
}

const { useCollectionItems } = createCollectionContext<BoardItem>()

const initialItems: readonly BoardItem[] = [
  {
    id: 'intro',
    data: {
      title: 'Intro',
      detail: '注册顺序 1',
      tone: 'blue',
    },
  },
  {
    id: 'usage',
    data: {
      title: 'Usage',
      detail: '注册顺序 2',
      tone: 'green',
    },
  },
  {
    id: 'edge',
    data: {
      title: 'Edge Cases',
      detail: '注册顺序 3',
      tone: 'coral',
    },
  },
]
const tones = [
  'blue',
  'green',
  'coral',
  'gold',
] as const

const items = shallowRef<readonly BoardItem[]>(cloneItems(initialItems))
const nextItemIndex = shallowRef(4)
const { snapshot } = useCollectionItems({ items })

const orderedItems = computed(() => snapshot.value.orderedItems)
const registeredItems = computed(() => snapshot.value.items)
const orderedIdsText = computed(() => snapshot.value.orderedIds.join(' / '))
const registeredIdsText = computed(() =>
  snapshot.value.items.map((item) => item.id).join(' / '),
)

function cloneItems(source: readonly BoardItem[]): BoardItem[] {
  return source.map((item) => ({
    id: item.id,
    data: { ...item.data },
  }))
}

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
  const tone = tones[(index - 1) % tones.length]!

  items.value = [
    ...items.value,
    {
      id: `item-${index}`,
      data: {
        title: `Item ${index}`,
        detail: `注册顺序 ${index}`,
        tone,
      },
    },
  ]
  nextItemIndex.value = index + 1
}

function removeItem(id: string): void {
  items.value = items.value.filter((item) => item.id !== id)
}

function resetItems(): void {
  items.value = cloneItems(initialItems)
  nextItemIndex.value = initialItems.length + 1
}
</script>

<template>
  <main class="collection-board">
    <header class="board-header">
      <div class="heading-group">
        <p class="eyebrow">
          @wrapper-items/vue
        </p>
        <h1 class="title">
          Collection Playground
        </h1>
      </div>

      <div class="toolbar" aria-label="collection actions">
        <button class="tool-button primary" type="button" @click="addItem">
          <Plus :size="18" aria-hidden="true" />
          <span>新增</span>
        </button>
        <button class="tool-button" type="button" @click="moveFirstToEnd">
          <ArrowDownUp :size="18" aria-hidden="true" />
          <span>轮转</span>
        </button>
        <button class="tool-button" type="button" @click="reverseOrder">
          <ListRestart :size="18" aria-hidden="true" />
          <span>反转</span>
        </button>
        <button class="icon-button" type="button" title="重置" @click="resetItems">
          <RotateCcw :size="18" aria-hidden="true" />
        </button>
      </div>
    </header>

    <section class="workspace" aria-label="collection snapshot">
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
          <span class="count-pill">{{ orderedItems.length }}</span>
        </div>

        <ol class="ordered-list">
          <li
            v-for="(item, index) in orderedItems"
            :key="item.id"
            class="item-row"
            :class="`tone-${item.data.tone}`"
          >
            <span class="item-index">{{ index + 1 }}</span>
            <span class="item-body">
              <strong class="item-title">{{ item.data.title }}</strong>
              <span class="item-detail">{{ item.id }} · {{ item.data.detail }}</span>
            </span>
            <button
              class="item-action"
              type="button"
              :title="`移除 ${item.data.title}`"
              @click="removeItem(item.id)"
            >
              <Trash2 :size="17" aria-hidden="true" />
            </button>
          </li>
        </ol>
      </div>

      <aside class="snapshot-panel">
        <div class="metric-grid">
          <div class="metric">
            <span class="metric-label">registered</span>
            <strong class="metric-value">{{ registeredItems.length }}</strong>
          </div>
          <div class="metric">
            <span class="metric-label">ordered</span>
            <strong class="metric-value">{{ orderedItems.length }}</strong>
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
            <span class="registry-dot" :class="`tone-${item.data.tone}`" />
            <span>{{ item.data.title }}</span>
            <code>{{ item.id }}</code>
          </li>
        </ul>
      </aside>
    </section>
  </main>
</template>

<style scoped>
.collection-board {
  width: min(1120px, calc(100vw - 40px));
  min-height: 100vh;
  margin: 0 auto;
  padding: 48px 0;
}

.board-header {
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

.eyebrow,
.section-kicker {
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

.toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.tool-button,
.icon-button,
.item-action {
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
}

.tool-button {
  min-height: 40px;
  gap: 8px;
  border-radius: 8px;
  padding: 0 14px;
  font-weight: 700;
}

.tool-button.primary {
  border-color: #2563eb;
  color: #fff;
  background: #2563eb;
}

.icon-button,
.item-action {
  width: 40px;
  height: 40px;
  border-radius: 8px;
}

.tool-button:hover,
.icon-button:hover,
.item-action:hover {
  transform: translateY(-1px);
  border-color: #2563eb;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.8fr);
  gap: 18px;
}

.ordered-panel,
.snapshot-panel {
  border: 1px solid #dbe4f0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 18px 48px rgba(35, 49, 75, 0.08);
}

.ordered-panel {
  padding: 18px;
}

.snapshot-panel {
  display: grid;
  align-content: start;
  gap: 16px;
  padding: 18px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.section-title,
.snapshot-title {
  margin: 0;
  color: #172033;
  line-height: 1.2;
}

.section-title {
  font-size: 22px;
}

.snapshot-title {
  font-size: 14px;
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

.ordered-list,
.registry-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

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
}

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

.item-title,
.item-detail {
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

.snapshot-code {
  display: block;
  overflow-x: auto;
  color: #0f5132;
  font-size: 13px;
  line-height: 1.5;
  white-space: nowrap;
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

.registry-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.tone-blue {
  border-left-color: #2563eb;
}

.tone-blue.registry-dot {
  background: #2563eb;
}

.tone-green {
  border-left-color: #16a34a;
}

.tone-green.registry-dot {
  background: #16a34a;
}

.tone-coral {
  border-left-color: #f97316;
}

.tone-coral.registry-dot {
  background: #f97316;
}

.tone-gold {
  border-left-color: #ca8a04;
}

.tone-gold.registry-dot {
  background: #ca8a04;
}

@media (max-width: 820px) {
  .collection-board {
    width: min(100vw - 24px, 640px);
    padding: 24px 0;
  }

  .board-header {
    align-items: stretch;
    flex-direction: column;
  }

  .toolbar {
    justify-content: flex-start;
  }

  .workspace {
    grid-template-columns: 1fr;
  }

  .title {
    font-size: 30px;
  }
}

@media (max-width: 480px) {
  .tool-button {
    flex: 1 1 calc(50% - 8px);
  }

  .item-row {
    grid-template-columns: 36px minmax(0, 1fr) 36px;
    padding: 10px;
  }

  .item-index,
  .item-action,
  .icon-button {
    width: 36px;
    height: 36px;
  }
}
</style>
