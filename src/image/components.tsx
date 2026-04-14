import type { FC } from 'hono/jsx'
import type { LineType } from './diff'
import type { TokenizedLine } from './tokenize'

export const colors = {
  bg: '#fafafa',
  card: '#ffffff',
  text: '#333333',
  textMuted: '#888888',
  border: '#f7f7f7',
  lineNum: '#3333334f',
  mixi2GradientStart: '#FF79A1',
  mixi2GradientEnd: '#FF9A00',
  addedText: '#1a7f37',
  addedBg: '#dafbe1',
  removedText: '#cf222e',
  removedBg: '#ffebe9',
  hunkBg: '#f6f8fa',
  hunkText: '#c0c0c0',
}

const LINE_BG = {
  added: colors.addedBg,
  removed: colors.removedBg,
  hunk: colors.hunkBg,
  context: 'transparent',
} as const satisfies Record<LineType, string>

type LineGroup = {
  type: LineType
  lines: TokenizedLine[]
}

const groupLines = (lines: TokenizedLine[]) => {
  return lines.reduce<LineGroup[]>((groups, line) => {
    const prev = groups.at(-1)
    const init = groups.slice(0, -1)

    if (prev?.type === line.type) {
      const newLines = [...prev.lines, line]
      const newGroup = { type: prev.type, lines: newLines }
      return [...init, newGroup]
    }

    const newGroup = { type: line.type, lines: [line] }
    return [...groups, newGroup]
  }, [])
}

type DiffImageProps = {
  lines: TokenizedLine[]
  fileName: string
  stats: { added: number; removed: number }
}

export const DiffImage: FC<DiffImageProps> = ({ lines, fileName, stats }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      minHeight: 500,
      padding: 32,
      rowGap: 24,
      fontFamily: 'Noto Sans JP, monospace',
      backgroundColor: colors.bg,
    }}
  >
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBlock: 0,
        columnGap: 16,
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          marginTop: 4,
          background: `linear-gradient(135deg, ${colors.mixi2GradientStart} 0%, ${colors.mixi2GradientEnd} 100%)`,
          flexShrink: 0,
        }}
      />
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: colors.text,
          letterSpacing: 0.5,
          margin: 0,
          flexGrow: 1,
        }}
      >
        ドキュメント更新検知BOT
      </h1>
      <div style={{ display: 'flex', gap: 8 }}>
        {stats.added > 0 && (
          <span
            style={{
              fontSize: 13,
              fontWeight: 'bold',
              color: colors.addedText,
              backgroundColor: colors.addedBg,
              padding: '4px 12px',
              borderRadius: 20,
            }}
          >
            + {stats.added}
          </span>
        )}
        {stats.removed > 0 && (
          <span
            style={{
              fontSize: 13,
              fontWeight: 'bold',
              color: colors.removedText,
              backgroundColor: colors.removedBg,
              padding: '4px 12px',
              borderRadius: 20,
            }}
          >
            - {stats.removed}
          </span>
        )}
      </div>
    </header>
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        backgroundColor: colors.card,
        borderRadius: 20,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          padding: '12px 24px',
          borderBottom: `1px solid ${colors.border}`,
          color: colors.textMuted,
          fontSize: 13,
        }}
      >
        {fileName}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: 12,
          fontSize: 13,
          lineHeight: 1.6,
          gap: 2,
        }}
      >
        {groupLines(lines).map((group, gi) => (
          <div
            key={gi}
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: LINE_BG[group.type],
              borderRadius: 8,
              paddingBlock: '1px 2px',
            }}
          >
            {group.lines.map((line, li) => (
              <div key={li} style={{ display: 'flex', padding: '1px 8px 1px 0' }}>
                <span
                  style={{
                    width: 36,
                    flexShrink: 0,
                    textAlign: 'right',
                    color: colors.lineNum,
                    fontSize: 12,
                    paddingRight: 8,
                  }}
                >
                  {line.type !== 'added' ? (line.oldNum ?? '') : ''}
                </span>
                <span
                  style={{
                    width: 36,
                    flexShrink: 0,
                    textAlign: 'right',
                    color: colors.lineNum,
                    fontSize: 12,
                    paddingRight: 8,
                  }}
                >
                  {line.type !== 'removed' ? (line.newNum ?? '') : ''}
                </span>
                <span
                  style={{
                    display: 'block',
                    marginLeft: 12,
                    wordBreak: 'break-all',
                    flexShrink: 1,
                    minWidth: 0,
                  }}
                >
                  {line.tokens.map((token, ti) => (
                    <span key={ti} style={{ display: 'inline', color: token.color }}>
                      {token.content}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </main>
    <footer
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: 13,
        color: colors.textMuted,
        columnGap: 12,
      }}
    >
      <span>@mixi2_docs</span>
      <span
        style={{ width: 2, height: 2, borderRadius: '50%', backgroundColor: colors.textMuted }}
      />
      <span>@mst_mkt</span>
    </footer>
  </div>
)
