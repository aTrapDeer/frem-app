import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    // Mirrors the `@/*` path alias in tsconfig.json so modules under test can
    // use the same import style as the rest of the app
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    include: ['lib/**/*.test.ts', 'app/**/*.test.ts'],
  },
})
