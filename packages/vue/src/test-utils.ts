import { createRenderer, defineComponent } from 'vue'
import type { App } from 'vue'

interface TestNode {
  children: TestNode[]
  parent: TestNode | null
  text?: string
  type?: string
}

const renderer = createRenderer<TestNode, TestNode>({
  patchProp() {},

  insert(child, parent, anchor = null) {
    child.parent = parent

    if (!anchor) {
      parent.children.push(child)
      return
    }

    const index = parent.children.indexOf(anchor)
    if (index === -1) {
      parent.children.push(child)
      return
    }

    parent.children.splice(index, 0, child)
  },

  remove(child) {
    const parent = child.parent
    if (!parent) return

    const index = parent.children.indexOf(child)
    if (index !== -1) {
      parent.children.splice(index, 1)
    }
    child.parent = null
  },

  createElement(type) {
    return { type, children: [], parent: null }
  },

  createText(text) {
    return { text, children: [], parent: null }
  },

  createComment(text) {
    return { text, children: [], parent: null }
  },

  setText(node, text) {
    node.text = text
  },

  setElementText(node, text) {
    node.text = text
  },

  parentNode(node) {
    return node.parent
  },

  nextSibling(node) {
    const parent = node.parent
    if (!parent) return null

    const index = parent.children.indexOf(node)
    return parent.children[index + 1] ?? null
  },
})

interface MountOptions {
  onError?: (error: unknown) => void
}

export function mount(
  setup: () => () => unknown,
  options: MountOptions = {},
): App<TestNode> {
  const Root = defineComponent({
    setup,
  })
  const root: TestNode = { children: [], parent: null }
  const app = renderer.createApp(Root)

  if (options.onError) {
    app.config.errorHandler = (error) => {
      options.onError?.(error)
    }
  }

  app.mount(root)
  return app
}
