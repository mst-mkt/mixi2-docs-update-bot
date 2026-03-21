import { createPatch, diffLines } from 'diff'

export type DocMap = Map<string, string>

export type LineDiff = {
  added: number
  removed: number
}

export type DocChange = {
  path: string
  type: 'added' | 'modified' | 'removed'
  lineDiff?: LineDiff
  patch?: string
  summary?: string
}

export type DiffResult = {
  changes: DocChange[]
}

const computeLineDiff = (oldContent: string, newContent: string): LineDiff =>
  diffLines(oldContent, newContent).reduce(
    (acc, change) => ({
      added: acc.added + (change.added ? (change.count ?? 0) : 0),
      removed: acc.removed + (change.removed ? (change.count ?? 0) : 0),
    }),
    { added: 0, removed: 0 },
  )

const docChange = (
  path: string,
  type: DocChange['type'],
  lineDiff?: LineDiff,
  patch?: string,
): DocChange => ({ path, type, lineDiff, patch })

export const computeDiff = (oldDocs: DocMap, newDocs: DocMap): DiffResult => {
  const added = [...newDocs.keys()]
    .filter((path) => !oldDocs.has(path))
    .map((path) => docChange(path, 'added'))

  const modified = [...newDocs.entries()].flatMap(([path, content]) => {
    const oldContent = oldDocs.get(path)
    if (oldContent === undefined || oldContent === content) return []
    const patch = createPatch(path, oldContent, content)
    return [docChange(path, 'modified', computeLineDiff(oldContent, content), patch)]
  })

  const removed = [...oldDocs.keys()]
    .filter((path) => !newDocs.has(path))
    .map((path) => docChange(path, 'removed'))

  return { changes: [...added, ...modified, ...removed] }
}

export const hasChanges = (diff: DiffResult): boolean => diff.changes.length > 0
