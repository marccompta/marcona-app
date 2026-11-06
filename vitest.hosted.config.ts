import { defineConfig } from 'vitest/config'

// Runs against the hosted Supabase project, from this machine only.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/hosted/**/*.test.ts'],
    testTimeout: 30000,
  },
})
