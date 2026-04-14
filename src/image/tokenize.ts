import type { ThemedToken, GrammarState, HighlighterCore } from 'shiki/core'
import type { DiffLine, LineType } from './diff'
import { colors } from './components'

export type TokenizedLine = {
  type: LineType
  tokens: ThemedToken[]
  oldNum: number | null
  newNum: number | null
}

export const tokenizeDiffLines = (shiki: HighlighterCore, lines: DiffLine[]): TokenizedLine[] => {
  let state: GrammarState | undefined

  return lines.map((line) => {
    if (line.type === 'hunk') {
      return {
        type: line.type,
        tokens: [{ content: '···', color: colors.hunkText, offset: 0 }],
        oldNum: null,
        newNum: null,
      }
    }

    const result = shiki.codeToTokens(line.content, {
      lang: 'markdown',
      theme: 'github-light',
      grammarState: state,
    })
    state = result.grammarState

    return {
      type: line.type,
      tokens: result.tokens.at(0) ?? [],
      oldNum: line.oldNum,
      newNum: line.newNum,
    }
  })
}
