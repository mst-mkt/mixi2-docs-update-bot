import { defineConfig } from 'vite-plus'

export default defineConfig({
  staged: { '*': 'vp check --fix' },
  lint: { options: { typeAware: true, typeCheck: true } },
  fmt: { semi: false, singleQuote: true },
  run: {
    tasks: {
      dev: {
        command: 'wrangler dev',
      },
      deploy: {
        command: 'wrangler deploy --minify',
      },
      typecheck: {
        command: 'tsc --noEmit',
      },
      generate: {
        command: 'wrangler types --env-interface CloudflareBindings',
      },
    },
  },
})
