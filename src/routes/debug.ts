import { Hono } from 'hono'
import type { Env } from '..'
import { renderDiffImage } from '../image/'

const SAMPLE_OLD = `# サンプル

## セクション1

サンプルテキスト1行目。
サンプルテキスト2行目。
サンプルテキスト3行目。
サンプルテキスト4行目。

## セクション2

この段落は変更されません。
この段落は変更されません。
この段落は変更されません。
この段落は変更されません。
この段落は変更されません。
この段落は変更されません。
この段落は変更されません。
この段落は変更されません。

## セクション3

- リスト項目A
- リスト項目B
- リスト項目C

## セクション4

ここに本文が入ります。
`

const SAMPLE_NEW = `# サンプル

## セクション1

サンプルテキスト1行目 (変更)。
サンプルテキスト2行目。
サンプルテキスト3行目。
サンプルテキスト4行目。

## セクション2

この段落は変更されません。
この段落は変更されません。
この段落は変更されません。
この段落は変更されません。
この段落は変更されません。
この段落は変更されません。
この段落は変更されません。
この段落は変更されません。

## セクション3

- リスト項目A
- リスト項目Bが変更されました
- リスト項目C
- リスト項目Dが追加されました

## セクション4

ここに本文が入ります。この文は変更されました。
`

const buildContent = (section: string, repeat: number) => {
  return [...Array(repeat)].map(() => section).join('\n')
}

export const debugRoute = new Hono<Env>().get('/image', async (c) => {
  const repeat = Number.parseInt(c.req.query('repeat') ?? '1') || 1

  const clamped = Math.max(1, Math.min(16, repeat))
  const oldContent = buildContent(SAMPLE_OLD, clamped)
  const newContent = buildContent(SAMPLE_NEW, clamped)
  const image = await renderDiffImage(oldContent, newContent, '/docs/sample.mdx')

  return c.body(image, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  })
})
