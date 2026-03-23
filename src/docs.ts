import type { DocMap } from './diff'

export const DOC_TOP_URL = 'https://developer.mixi.social'
const HEADING_PATH_PATTERN = /^# .+ \((.+)\)$/

const getDocPaths = async (): Promise<string[]> => {
  const res = await fetch(`${DOC_TOP_URL}/docs/llms-full.txt`)
  if (!res.ok) throw new Error(`Failed to fetch llms-full.txt: ${res.status}`)
  const llmsFullText = await res.text()

  return llmsFullText.split('\n').flatMap((line) => {
    const match = HEADING_PATH_PATTERN.exec(line)
    return match?.[1] !== undefined && match[1] !== '/docs/' ? [match[1]] : []
  })
}

const getDocContent = async (path: string) => {
  const res = await fetch(`${DOC_TOP_URL}${path}.mdx`)
  if (!res.ok) throw new Error(`Failed to fetch ${path}.mdx: ${res.status}`)
  return await res.text()
}

export const getAllDocs = async (): Promise<DocMap> => {
  const docPaths = await getDocPaths()
  const entries = await Promise.all(
    docPaths.map(async (path): Promise<[string, string]> => [path, await getDocContent(path)]),
  )
  return new Map(entries)
}
