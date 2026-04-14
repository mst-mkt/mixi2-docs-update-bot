import { initSync, Renderer } from '@takumi-rs/wasm'
import module from '@takumi-rs/wasm/takumi_wasm_bg.wasm'

const FONT_URLS = [
  {
    name: 'Noto Sans JP',
    weight: 400,
    style: 'normal' as const,
    url: 'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/japanese-400-normal.ttf',
  },
  {
    name: 'Noto Sans JP',
    weight: 700,
    style: 'normal' as const,
    url: 'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/japanese-700-normal.ttf',
  },
]

let rendererPromise: Promise<Renderer> | null = null

const initRenderer = async () => {
  initSync(module)

  const fonts = await Promise.all(
    FONT_URLS.map(async ({ url, ...meta }) => {
      const res = await fetch(url)

      if (!res.ok) throw new Error(`Failed to fetch font: ${url} (${res.status})`)

      const arrayBuffer = await res.arrayBuffer()
      return { ...meta, data: arrayBuffer }
    }),
  )

  return new Renderer({ fonts })
}

export const getRenderer = () => {
  if (rendererPromise !== null) return rendererPromise

  rendererPromise = initRenderer()

  return rendererPromise
}
