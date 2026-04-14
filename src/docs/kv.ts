import type { DiffResult, DocMap } from '../diff'

export type KVStore = Pick<KVNamespace, 'get' | 'put' | 'delete'>

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
  const upserts = diff.changes
    .filter((c) => c.type !== 'removed')
    .flatMap((c) => {
      const content = docs.get(c.path)
      return content !== undefined ? [kv.put(docKey(c.path), content)] : []
    })
  const deletes = diff.changes
    .filter((c) => c.type === 'removed')
    .map((c) => kv.delete(docKey(c.path)))

  await Promise.all([...upserts, ...deletes])
  await kv.put(MANIFEST_KEY, JSON.stringify([...docs.keys()]))
}
