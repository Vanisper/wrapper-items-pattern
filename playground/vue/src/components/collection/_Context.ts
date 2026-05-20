import { createCollectionContext } from '@wrapper-items/vue'

export const {
  provideCollection,
  useCollection,
  useCollectionItem,
} = createCollectionContext({
  missingProviderMessage:
    'Missing playground collection provider. Render items inside ItemsWrapper first.',
})
