import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',   // tabListInteract.test.ts needs DOM APIs
    globals:     true,
    // Also pick up *.prop.ts alongside *.test.ts and *.spec.ts
    include: ['**/*.{test,spec,prop}.?(c|m)[jt]s?(x)'],
  },
})
