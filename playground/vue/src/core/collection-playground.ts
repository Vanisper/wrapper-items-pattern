export type CollectionItemTone = 'blue' | 'green' | 'coral' | 'gold'

export interface PlaygroundCollectionItem {
  readonly id: string
  readonly data: {
    readonly title: string
    readonly detail: string
    readonly tone: CollectionItemTone
  }
}

export const initialPlaygroundItems: readonly PlaygroundCollectionItem[] = [
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

const itemTones = ['blue', 'green', 'coral', 'gold'] as const

export function clonePlaygroundItems(
  source: readonly PlaygroundCollectionItem[],
): PlaygroundCollectionItem[] {
  return source.map((item) => ({
    id: item.id,
    data: { ...item.data },
  }))
}

export function createPlaygroundItem(index: number): PlaygroundCollectionItem {
  const tone = itemTones[(index - 1) % itemTones.length]!

  return {
    id: `item-${index}`,
    data: {
      title: `Item ${index}`,
      detail: `注册顺序 ${index}`,
      tone,
    },
  }
}
