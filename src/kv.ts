import type { DiffResult, DocMap } from './diff'

export type KVStore = {
  get(this: void, key: string): Promise<string | null>
  put(this: void, key: string, value: string): Promise<void>
  delete(this: void, key: string): Promise<void>
}

const MANIFEST_KEY = 'manifest'
const docKey = (path: string) => `doc:${path}`

export const loadDocs = async (kv: KVStore): Promise<DocMap> => {
  const manifestJson = await kv.get(MANIFEST_KEY)
  if (manifestJson === null) return new Map()

  const paths: string[] = JSON.parse(manifestJson)
  const results = await Promise.all(
    paths.map(async (path) => {
      const content = await kv.get(docKey(path))
      return content !== null ? ([path, content] as [string, string]) : null
    }),
  )

  return new Map(results.filter((entry) => entry !== null))
}

export const saveDocs = async (kv: KVStore, docs: DocMap, diff: DiffResult): Promise<void> => {
  await Promise.all([
    ...diff.changes
      .filter((c) => c.type !== 'removed')
      .map((c) => kv.put(docKey(c.path), docs.get(c.path) ?? '')),
    ...diff.changes.filter((c) => c.type === 'removed').map((c) => kv.delete(docKey(c.path))),
  ])
  await kv.put(MANIFEST_KEY, JSON.stringify([...docs.keys()]))
}
