import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import { ImageResponse } from 'takumi-js/response'
import { createPatch, parsePatch } from 'diff'
import { parseDiffLines } from './diff'
import { tokenizeDiffLines } from './tokenize'
import { DiffImage } from './components'
import { getRenderer } from './renderer'

let highlighterPromise: ReturnType<typeof createHighlighterCore> | null = null

const getHighlighter = () => {
  if (highlighterPromise !== null) return highlighterPromise

  highlighterPromise = createHighlighterCore({
    themes: [import('shiki/themes/github-light.mjs')],
    langs: [import('shiki/langs/markdown.mjs')],
    engine: createJavaScriptRegexEngine(),
  })

  return highlighterPromise
}

const IMAGE_WIDTH = 800

export const renderDiffImage = async (oldContent: string, newContent: string, fileName: string) => {
  const patch = parsePatch(createPatch(fileName, oldContent, newContent)).at(0)
  if (patch === undefined) throw new Error('Failed to parse patch')

  const shiki = await getHighlighter()
  const renderer = await getRenderer()

  const diffLines = parseDiffLines(patch)
  const tokenizedLines = tokenizeDiffLines(shiki, diffLines)

  const stats = diffLines.reduce(
    (acc, line) => ({
      added: acc.added + (line.type === 'added' ? 1 : 0),
      removed: acc.removed + (line.type === 'removed' ? 1 : 0),
    }),
    { added: 0, removed: 0 },
  )

  const response = new ImageResponse(
    <DiffImage lines={tokenizedLines} fileName={fileName} stats={stats} />,
    { width: IMAGE_WIDTH, renderer, format: 'png' },
  )

  return response.arrayBuffer()
}
