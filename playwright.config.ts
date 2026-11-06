import { defineConfig } from '@playwright/test'

const deployed = process.env.E2E_BASE_URL

// WebKit can't launch on this machine, so phones are emulated in Chromium.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: deployed ?? 'http://localhost:4173/marcona-app/',
    viewport: { width: 360, height: 740 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    locale: 'ca-ES',
    timezoneId: 'Europe/Madrid',
  },
  webServer: deployed
    ? undefined
    : {
        command: 'npm run build && npm run preview -- --port 4173 --strictPort',
        url: 'http://localhost:4173/marcona-app/',
        reuseExistingServer: true,
        timeout: 120000,
      },
})
