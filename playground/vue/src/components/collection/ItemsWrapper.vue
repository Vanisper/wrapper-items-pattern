<script setup lang="ts">
import { provideCollection } from './_Context'
import { provideCollectionOrder } from "./_OrderRegistry";

const { controller, snapshot } = provideCollection()

provideCollectionOrder((ids) => {
  controller.setOrder(ids)
})

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
